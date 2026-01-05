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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Added
import { useState, useEffect } from "react";

interface LineItemsEditorProps {
    items: POItem[];
    onChange: (items: POItem[]) => void;
}

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
    // We'll trust the parent to pass items, but keep local copy if needed for perf, 
    // currently we'll just edit directly on change.

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    return (
        <div className="border rounded-md overflow-x-auto">
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items && items.length > 0 ? (
                        items.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.article_code || ""}
                                        onChange={(e) => updateItem(idx, "article_code", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.barcode || ""}
                                        onChange={(e) => updateItem(idx, "barcode", e.target.value)}
                                        placeholder="Barcode"
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Textarea
                                        className="min-h-[40px] md:min-h-[32px] resize-y text-xs p-1.5 leading-tight break-all overflow-hidden"
                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                        value={item.article_description || item.description || ""}
                                        onChange={(e) =>
                                            updateItem(idx, "article_description", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        type="number"
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.qty || item.quantity || 0}
                                        onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.uom || ""}
                                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        type="number"
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.unit_price || 0}
                                        onChange={(e) =>
                                            updateItem(idx, "unit_price", parseFloat(e.target.value))
                                        }
                                    />
                                </TableCell>
                                <TableCell className="p-1 md:p-2 align-middle">
                                    <Input
                                        type="number"
                                        className="h-10 md:h-8 w-full text-xs"
                                        value={item.total_price || item.line_total || 0}
                                        onChange={(e) =>
                                            updateItem(idx, "total_price", parseFloat(e.target.value))
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">
                                No items extracted.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
