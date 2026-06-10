import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VariantOption {
  value: string;
  price_modifier: number;
}

export interface VariantGroup {
  name: string;
  options: VariantOption[];
}

interface VariantEditorProps {
  variants: VariantGroup[];
  onChange: (variants: VariantGroup[]) => void;
  basePrice: number;
  currency?: string;
}

export default function VariantEditor({ variants, onChange, basePrice, currency = "USD" }: VariantEditorProps) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(variants.length > 0 ? 0 : null);

  const addGroup = () => {
    onChange([...variants, { name: "", options: [{ value: "", price_modifier: 0 }] }]);
    setExpandedGroup(variants.length);
  };

  const removeGroup = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
    if (expandedGroup === idx) setExpandedGroup(null);
  };

  const updateGroupName = (idx: number, name: string) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], name };
    onChange(updated);
  };

  const addOption = (groupIdx: number) => {
    const updated = [...variants];
    updated[groupIdx] = {
      ...updated[groupIdx],
      options: [...updated[groupIdx].options, { value: "", price_modifier: 0 }],
    };
    onChange(updated);
  };

  const removeOption = (groupIdx: number, optIdx: number) => {
    const updated = [...variants];
    updated[groupIdx] = {
      ...updated[groupIdx],
      options: updated[groupIdx].options.filter((_, i) => i !== optIdx),
    };
    onChange(updated);
  };

  const updateOption = (groupIdx: number, optIdx: number, field: keyof VariantOption, val: string | number) => {
    const updated = [...variants];
    updated[groupIdx] = {
      ...updated[groupIdx],
      options: updated[groupIdx].options.map((o, i) =>
        i === optIdx ? { ...o, [field]: val } : o
      ),
    };
    onChange(updated);
  };

  const formatPrice = (mod: number) => {
    if (mod === 0) return `$${basePrice.toFixed(2)}`;
    const total = basePrice + mod;
    const sign = mod > 0 ? "+" : "";
    return `$${total.toFixed(2)} (${sign}$${mod.toFixed(2)})`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">Variants & Options</Label>
        <Button variant="outline" size="sm" onClick={addGroup} className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" /> Add Variant Group
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No variants configured. Add variant groups like "Color", "Size" to offer options with different pricing.
        </p>
      )}

      {variants.map((group, gi) => (
        <Card key={gi} className="border-border/50 bg-secondary/30">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/50 rounded-t-lg transition-colors"
            onClick={() => setExpandedGroup(expandedGroup === gi ? null : gi)}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {group.name || `Variant Group ${gi + 1}`}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {group.options.length} option{group.options.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon" variant="ghost" className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); removeGroup(gi); }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
              {expandedGroup === gi ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          {expandedGroup === gi && (
            <CardContent className="pt-2 pb-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Group Name</Label>
                <Input
                  value={group.name}
                  onChange={e => updateGroupName(gi, e.target.value)}
                  placeholder="e.g. Color, Size, Material"
                  className="h-7 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Options</Label>
                {group.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <Input
                      value={opt.value}
                      onChange={e => updateOption(gi, oi, "value", e.target.value)}
                      placeholder="e.g. Red, Large"
                      className="h-7 text-sm flex-1"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">±$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={opt.price_modifier}
                        onChange={e => updateOption(gi, oi, "price_modifier", parseFloat(e.target.value) || 0)}
                        className="h-7 text-sm w-20"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 w-24 text-right">
                      {formatPrice(opt.price_modifier)}
                    </span>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                      onClick={() => removeOption(gi, oi)}
                      disabled={group.options.length <= 1}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOption(gi)} className="gap-1 h-6 text-[11px]">
                  <Plus className="h-3 w-3" /> Add Option
                </Button>
              </div>

              {/* Price preview for multi-layer */}
              {variants.length > 1 && gi === variants.length - 1 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <Label className="text-[10px] text-muted-foreground">Price formula: Base (${basePrice.toFixed(2)}) + sum of selected option modifiers</Label>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
