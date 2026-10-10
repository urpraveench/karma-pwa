import { Sheet } from '../components/Sheet';
import { InstallSheetBody } from '../components/InstallGuide';
import { useApp } from '../state/app';

export function InstallSheet() {
  const { closeSheet } = useApp();
  return <Sheet onClose={closeSheet}><InstallSheetBody /></Sheet>;
}
