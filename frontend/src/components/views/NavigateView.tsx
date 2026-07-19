import { NavigationWidget } from '../widgets/NavigationWidget';
import { NavigationTarget } from '@/app/page';

export function NavigateView({ onClose, target }: { onClose?: () => void; target?: NavigationTarget | null }) {
  return (
    <div className="absolute inset-0 z-[100] bg-black flex flex-col w-full h-full overflow-hidden">
      <NavigationWidget onClose={onClose} target={target} />
    </div>
  );
}
