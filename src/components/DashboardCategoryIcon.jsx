import { BarChart3, FileSpreadsheet, Folder, LayoutDashboard, Table2, PieChart, FileText, Laptop, Code2, Box } from 'lucide-react';
import { useDashboardCategories } from '../context/DashboardCategoriesContext';

/** Icon registry keyed by the `icon` column stored on dashboard_categories. */
export const CATEGORY_ICONS = {
  'bar-chart': BarChart3,
  'file-spreadsheet': FileSpreadsheet,
  folder: Folder,
  layout: LayoutDashboard,
  table: Table2,
  'pie-chart': PieChart,
  file: FileText,
  laptop: Laptop,
  code: Code2,
  box: Box,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(CATEGORY_ICONS).map((key) => ({ key, Icon: CATEGORY_ICONS[key] }));

export default function DashboardCategoryIcon({ category, size = 16, showLabel = false }) {
  const { categoryMeta } = useDashboardCategories();
  const meta = categoryMeta(category);
  const Icon = CATEGORY_ICONS[meta.icon] || Box;
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
