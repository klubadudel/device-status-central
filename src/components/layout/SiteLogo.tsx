import type { LucideProps } from 'lucide-react'; // Keep if other Lucide icons might be used, or remove if not.
import { PanelTopOpen } from 'lucide-react'; // Example icon

interface SiteLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  textColorClass?: string;
}

export function SiteLogo({ size = 'md', className = '', textColorClass = 'text-primary' }: SiteLogoProps) {
  const titleTextSizeClass = size === 'lg' ? "text-3xl" : size === 'md' ? "text-2xl" : "text-xl";

  if (size === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className} h-8 w-8 rounded-md bg-sidebar-accent`}>
         <span className={`text-xl font-extrabold text-sidebar-primary-foreground`}>D</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <h1 className={`${titleTextSizeClass} font-bold ${textColorClass} whitespace-nowrap`}>
        Device<span className="text-accent">Status</span>Central
      </h1>
    </div>
  );
}