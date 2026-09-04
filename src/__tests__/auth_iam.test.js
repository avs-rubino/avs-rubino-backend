const authMiddleware = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/auth');
const admin = require('../config/firebase');

const simulateAuth = async (tokenPayload, method = 'GET') => {
  let status = 200;
  let responseData = null;
  let nextCalled = false;

  const originalVerify = admin.auth().verifyIdToken;
  admin.auth().verifyIdToken = async () => tokenPayload;

  const req = {
    headers: { authorization: 'Bearer mock-token' },
    method,
  };
  const res = {
    status: (s) => {
      status = s;
      return {
        json: (d) => {
          responseData = d;
        },
      };
    },
  };
  const next = () => {
    nextCalled = true;
  };

  try {
    await authMiddleware(req, res, next);
  } finally {
    admin.auth().verifyIdToken = originalVerify;
  }

  return { status, responseData, nextCalled };
};

describe('IAM & Auth Middleware', () => {
  describe('authMiddleware (Zero-Trust & Role Permissions)', () => {
    it('allows Super_Admin on DELETE requests', async () => {
      const res = await simulateAuth({ role: 'Super_Admin' }, 'DELETE');
      expect(res.nextCalled).toBe(true);
    });

    it('blocks Editor_Admin on DELETE requests with 403', async () => {
      const res = await simulateAuth({ role: 'Editor_Admin' }, 'DELETE');
      expect(res.status).toBe(403);
      expect(res.nextCalled).toBe(false);
    });

    it('allows Editor_Admin on POST requests', async () => {
      const res = await simulateAuth({ role: 'Editor_Admin' }, 'POST');
      expect(res.nextCalled).toBe(true);
    });

    it('rejects unauthorized/unknown role with 403', async () => {
      const res = await simulateAuth({ role: 'Viewer' }, 'GET');
      expect(res.status).toBe(403);
    });

    it('strictly blocks Utente_Normale with 403 (Zero-Trust baseline)', async () => {
      const res = await simulateAuth({ role: 'Utente_Normale' }, 'GET');
      expect(res.status).toBe(403);
      expect(res.nextCalled).toBe(false);
    });

    it('blocks tokens missing a role claim with 403', async () => {
      const res = await simulateAuth({}, 'GET');
      expect(res.status).toBe(403);
    });
  });

  describe('requireSuperAdmin middleware', () => {
    it('allows Super_Admin user', () => {
      let superAdminAllowed = false;
      requireSuperAdmin({ user: { role: 'Super_Admin' } }, {}, () => {
        superAdminAllowed = true;
      });
      expect(superAdminAllowed).toBe(true);
    });

    it('blocks Editor_Admin with 403', () => {
      let editorStatus = 200;
      requireSuperAdmin(
        { user: { role: 'Editor_Admin' } },
        {
          status: (s) => {
            editorStatus = s;
            return { json: () => {} };
          },
        },
        () => {}
      );
      expect(editorStatus).toBe(403);
    });
  });
});
