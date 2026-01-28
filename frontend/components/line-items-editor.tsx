import { POItem } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface LineItemsEditorProps {
    items: POItem[];
    onChange: (items: POItem[]) => void;
}

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground text-sm">
                No items extracted.
            </div>
        );
    }

    return (
        <>
            {/* Mobile View: Cards */}
            <div className="space-y-3 block md:hidden">
                {items.map((item, idx) => (
                    <Card key={idx} className="bg-gray-50 dark:bg-zinc-900/30">
                        <CardContent className="p-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-medium text-muted-foreground">
                                    Item {idx + 1}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => removeItem(idx)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">Description</Label>
                                    <textarea
                                        className="w-full min-h-[60px] p-2 text-sm border rounded-md resize-none bg-background"
                                        value={item.article_description || item.description || ""}
                                        onChange={(e) => updateItem(idx, "article_description", e.target.value)}
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Article Code</Label>
                                    <Input
                                        className="h-9 text-sm"
                                        value={item.article_code || ""}
                                        onChange={(e) => updateItem(idx, "article_code", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Barcode</Label>
                                    <Input
                                        className="h-9 text-sm"
                                        value={item.barcode || ""}
                                        onChange={(e) => updateItem(idx, "barcode", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Qty</Label>
                                    <Input
                                        type="number"
                                        className="h-9 text-sm"
                                        value={item.qty || item.quantity || 0}
                                        onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">UOM</Label>
                                    <Input
                                        className="h-9 text-sm"
                                        value={item.uom || ""}
                                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9 text-sm"
                                        value={item.unit_price || 0}
                                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Total</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-9 text-sm font-medium"
                                        value={item.total_price || item.line_total || 0}
                                        onChange={(e) => updateItem(idx, "total_price", parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[110px] text-xs">Article Code</TableHead>
                            <TableHead className="min-w-[150px] text-xs">Barcode</TableHead>
                            <TableHead className="min-w-[180px] text-xs">Description</TableHead>
                            <TableHead className="min-w-[60px] text-xs">Qty</TableHead>
                            <TableHead className="min-w-[70px] text-xs">UOM</TableHead>
                            <TableHead className="min-w-[90px] text-xs">Unit Price</TableHead>
                            <TableHead className="min-w-[90px] text-xs">Total</TableHead>
                            <TableHead className="w-[50px] text-xs"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="p-2">
                                    <Input
                                        className="h-8 text-xs"
                                        value={item.article_code || ""}
                                        onChange={(e) => updateItem(idx, "article_code", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        className="h-8 text-xs"
                                        value={item.barcode || ""}
                                        onChange={(e) => updateItem(idx, "barcode", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        className="h-8 text-xs"
                                        value={item.article_description || item.description || ""}
                                        onChange={(e) => updateItem(idx, "article_description", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={item.qty || item.quantity || 0}
                                        onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        className="h-8 text-xs"
                                        value={item.uom || ""}
                                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-xs"
                                        value={item.unit_price || 0}
                                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-xs"
                                        value={item.total_price || item.line_total || 0}
                                        onChange={(e) => updateItem(idx, "total_price", parseFloat(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell className="p-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => removeItem(idx)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
