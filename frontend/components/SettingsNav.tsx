'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { 
  Settings, 
  Building2, 
  Database, 
  Shield,
  Plug,
  Beaker
} from 'lucide-react';

export default function SettingsNav() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  const navItems = [
    {
      href: '/dashboard/settings',
      label: 'Integrations',
      icon: Plug,
      description: 'WhatsApp & Shopify',
      exact: true,
    },
    {
      href: '/dashboard/settings/workspace',
      label: 'Workspace',
      icon: Building2,
      description: 'Name & details',
    },
    {
      href: '/dashboard/settings/permissions',
      label: 'Permissions',
      icon: Shield,
      description: 'Roles & access control',
      permission: 'users:view_all',
    },
    {
      href: '/dashboard/settings/test-data',
      label: 'Test Data',
      icon: Beaker,
      description: 'Generate & reset test data',
      permission: 'workspace:delete', // Only owner
    },
    {
      href: '/dashboard/settings/data',
      label: 'Data Management',
      icon: Database,
      description: 'Delete & restore',
      permission: 'workspace:delete', // Only owner
    },
  ];

  return (
    <nav className="bg-white rounded-lg border border-gray-200 p-2 space-y-1 sticky top-6">
      {navItems.map((item) => {
        // Check if user has required permission
        if (item.permission && !hasPermission(item.permission)) {
          return null;
        }

        const isActive = item.exact 
          ? pathname === item.href 
          : pathname?.startsWith(item.href);
        
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isActive ? 'text-purple-600' : 'text-gray-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
