import { useEffect, useState } from 'react';
import { usersApi } from '../../api/resources';

export default function ManagerEmployees() {
  const [users, setUsers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'MEDEWERKER' });
  const [error, setError] = useState('');

  function load() {
    usersApi.list(showInactive).then(setUsers);
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await usersApi.create(form);
      setForm({ email: '', firstName: '', lastName: '', role: 'MEDEWERKER' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Aanmaken mislukt');
    }
  }

  async function toggleActive(u) {
    if (u.isActive) {
      if (!confirm(`${u.firstName} uit dienst zetten? Historische roosters blijven bewaard.`)) return;
      await usersApi.update(u.id, { isActive: false });
    } else {
      await usersApi.update(u.id, { isActive: true, employmentEndDate: null });
    }
    load();
  }

  async function resendInvite(u) {
    if (!confirm(`Nieuw tijdelijk wachtwoord sturen naar ${u.email}?`)) return;
    await usersApi.resendInvite(u.id);
    alert('Nieuwe uitnodiging verstuurd');
  }

  const active = users.filter((u) => u.isActive);
  const inactive = users.filter((u) => !u.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Medewerkers</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? 'Annuleren' : 'Nieuwe medewerker'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Voornaam</label>
            <input
              className="input"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Achternaam</label>
            <input
              className="input"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="MEDEWERKER">Medewerker</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Aanmaken & uitnodigen
            </button>
            <p className="text-xs text-slate-500 mt-2">
              De medewerker krijgt een e-mail met tijdelijk wachtwoord.
            </p>
          </div>
        </form>
      )}

      <div className="card mb-3 p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2">Naam</th>
              <th className="text-left px-4 py-2">E-mail</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-right px-4 py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            {active.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-4 py-2 font-medium">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">{u.role}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button onClick={() => resendInvite(u)} className="text-brand-600 hover:underline">
                    Reset wachtwoord
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-red-600 hover:underline">
                    Uit dienst
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          id="show-inactive"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        <label htmlFor="show-inactive" className="text-sm">
          Voormalige medewerkers tonen
        </label>
      </div>

      {showInactive && inactive.length > 0 && (
        <div className="card p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2">Naam</th>
                <th className="text-left px-4 py-2">E-mail</th>
                <th className="text-right px-4 py-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {inactive.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 text-slate-500">
                  <td className="px-4 py-2">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleActive(u)} className="text-brand-600 hover:underline">
                      Reactiveren
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
