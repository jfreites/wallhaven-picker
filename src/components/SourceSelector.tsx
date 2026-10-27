import { SOURCES, SourceId } from "../sources";
import { SegmentedControl } from "./SegmentedControl";

interface SourceSelectorProps {
  value: SourceId;
  onChange: (id: SourceId) => void;
}

export function SourceSelector({ value, onChange }: SourceSelectorProps) {
  return (
    <SegmentedControl
      size="sm"
      label="Fuente de wallpapers"
      value={value}
      onChange={onChange}
      items={SOURCES.map((s) => ({ id: s.id, label: s.name }))}
    />
  );
}
