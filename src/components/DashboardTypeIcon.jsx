import { BarChart3, FileSpreadsheet, Folder, LayoutDashboard } from 'lucide-react';
import { dashboardTypeMeta } from '../utils/constants';

const ICONS = {
  powerbi: BarChart3,
  excel: FileSpreadsheet,
  sharepoint: Folder,
};

export default function DashboardTypeIcon({ type, size = 16, showLabel = false }) {
  const meta = dashboardTypeMeta(type);
  const Icon = ICONS[type] || LayoutDashboard;
  if (!showLabel) {
    return <Icon size={size} style={{ color: meta.color }} />;
  }
  return (
    <span className="type-chip" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}1a` }}>
      <Icon size={12} style={{ color: meta.color }} />
      {meta.label}
    </span>
  );
}