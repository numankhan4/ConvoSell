interface SettingsHeaderProps {
  role: string;
}

export function SettingsHeader({ role }: SettingsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              role === 'owner'
                ? 'bg-purple-100 text-purple-800'
                : role === 'admin'
                ? 'bg-blue-100 text-blue-800'
                : role === 'manager'
                ? 'bg-green-100 text-green-800'
                : role === 'agent'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {role}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-600">Manage your integrations and configurations</p>
      </div>
    </div>
  );
}
