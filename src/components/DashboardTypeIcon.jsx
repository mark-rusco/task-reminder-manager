import { BarChart3, FileSpreadsheet, Folder, LayoutDashboard, Table2, PieChart, FileText, Box } from 'lucide-react';
import { useDashboardTypes } from '../context/DashboardTypesContext';

/** Icon registry keyed by the `icon` column stored on dashboard_types. */
export const TYPE_ICONS = {
  'bar-chart': BarChart3,
  'file-spreadsheet': FileSpreadsheet,
  folder: Folder,
  layout: LayoutDashboard,
  table: Table2,
  'pie-chart': PieChart,
  file: FileText,
  box: Box,
};

export const TYPE_ICON_OPTIONS = Object.keys(TYPE_ICONS).map((key) => ({ key, Icon: TYPE_ICONS[key] }));

export default function DashboardTypeIcon({ type, size = 16, showLabel = false }) {
  const { typeMeta } = useDashboardTypes();
  const meta = typeMeta(type);
  const Icon = TYPE_ICONS[meta.icon] || LayoutDashboard;
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