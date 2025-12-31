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
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Article Code</TableHead>
                        <TableHead className="w-[120px]">Barcode</TableHead>
                        <TableHead className="w-[250px]">Description</TableHead>
                        <TableHead className="w-[50px]">Qty</TableHead>
                        <TableHead className="w-[100px]">UOM</TableHead>
                        <TableHead className="w-[100px]">Unit Price</TableHead>
                        <TableHead className="w-[100px]">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items && items.length > 0 ? (
                        items.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Input
                                        className="h-9 w-full"
                                        value={item.article_code || ""}
                                        onChange={(e) => updateItem(idx, "article_code", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        className="h-9 w-full"
                                        value={item.barcode || ""}
                                        onChange={(e) => updateItem(idx, "barcode", e.target.value)}
                                        placeholder="Barcode"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Textarea
                                        className="h-9 min-h-[36px] resize-y text-xs p-2 leading-tight"
                                        value={item.article_description || item.description || ""}
                                        onChange={(e) =>
                                            updateItem(idx, "article_description", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="h-9 w-full"
                                        value={item.qty || item.quantity || 0}
                                        onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        className="h-9 w-full"
                                        value={item.uom || ""}
                                        onChange={(e) => updateItem(idx, "uom", e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="h-9 w-full"
                                        value={item.unit_price || 0}
                                        onChange={(e) =>
                                            updateItem(idx, "unit_price", parseFloat(e.target.value))
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="h-9 w-full"
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
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                No items extracted.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
