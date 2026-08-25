// api/admin.js
// Esta funcion corre en el servidor de Vercel, nunca en el navegador.
// Es la unica que conoce la SUPABASE_SERVICE_ROLE_KEY (guardada como
// variable de entorno en Vercel, jamas escrita en el codigo).
//
// El navegador (index.html) le pide a ESTA funcion que haga las tareas
// de administrador (crear/borrar/resetear contrasena de embajadores),
// mandando el token de sesion del admin que esta logueado. Esta funcion
// verifica que ese token pertenezca de verdad a un usuario con role='admin'
// antes de hacer nada.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return res.status(500).json({ error: 'Faltan variables de entorno en Vercel' });
  }

  try {
    const { action, payload } = req.body || {};
    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();

    if (!callerToken) {
      return res.status(401).json({ error: 'No autorizado (falta token)' });
    }

    // 1) Confirmar quien es el que llama, usando SU propio token (no la service key)
    const whoRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + callerToken, apikey: ANON_KEY }
    });
    if (!whoRes.ok) {
      return res.status(401).json({ error: 'Token invalido o vencido' });
    }
    const whoData = await whoRes.json();
    const callerId = whoData.id;

    // 2) Confirmar que ese usuario tiene role='admin' en la tabla profiles
    const profRes = await fetch(
      SUPABASE_URL + '/rest/v1/profiles?id=eq.' + callerId + '&select=role',
      { headers: { Authorization: 'Bearer ' + SERVICE_KEY, apikey: SERVICE_KEY } }
    );
    const profArr = await profRes.json();
    if (!Array.isArray(profArr) || !profArr.length || profArr[0].role !== 'admin') {
      return res.status(403).json({ error: 'Esta accion es solo para administradores' });
    }

    // 3) Ejecutar la accion pedida, ya verificado que quien llama es admin
    if (action === 'create_user') {
      const { email, password } = payload || {};
      if (!email || !password) return res.status(400).json({ error: 'Falta email o contrasena' });
      const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + SERVICE_KEY,
          apikey: SERVICE_KEY
        },
        body: JSON.stringify({ email, password, email_confirm: true })
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'reset_password') {
      const { userId, password } = payload || {};
      if (!userId || !password) return res.status(400).json({ error: 'Falta userId o contrasena' });
      const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + userId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + SERVICE_KEY,
          apikey: SERVICE_KEY
        },
        body: JSON.stringify({ password, email_confirm: true })
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'delete_user') {
      const { userId } = payload || {};
      if (!userId) return res.status(400).json({ error: 'Falta userId' });
      const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + userId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + SERVICE_KEY, apikey: SERVICE_KEY }
      });
      return res.status(r.status).json({ ok: r.ok });
    }

    return res.status(400).json({ error: 'Accion desconocida: ' + action });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno: ' + e.message });
  }
};
