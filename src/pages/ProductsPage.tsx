import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { useSearchParams } from "react-router-dom";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { formatDate } from "@/utils/date";
import { formatMoney } from "@/utils/currency";
import { AmountInput } from "@/components/shared/AmountInput";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ArrowUpDown, Package } from "lucide-react";
import type { Product, RecordStatus } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileFormSteps } from "@/components/shared/MobileFormSteps";
import { cn } from "@/lib/utils";
import { CreatableSelect } from "@/components/shared/CreatableSelect";
import { INVENTORY_CATEGORY_PRESETS } from "@/constants/fieldPresets";
import { mergeOptions } from "@/utils/creatableOptions";

const defaultProduct: Omit<Product, "id" | "createdAt"> = {
  name: "", category: "", vendor: "", purchaseDate: "", purchaseCost: 0,
  warrantyExpiry: "", serialNumber: "", assignedTo: "", status: "active", notes: "",
};
const statusOpts = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function ProductsPage() {
  useCurrencyDisplay();
  const { products, addProduct, updateProduct, deleteProduct, isLoading, error } = useStore();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "true");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(defaultProduct);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const categoryOptions = useMemo(
    () => mergeOptions(INVENTORY_CATEGORY_PRESETS, products.map((p) => p.category)),
    [products],
  );

  const vendorOptions = useMemo(
    () => mergeOptions([], products.map((p) => p.vendor)),
    [products],
  );

  const filtered = useMemo(() => {
    let data = [...products];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((p) => p.name.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.assignedTo.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") data = data.filter((p) => p.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [products, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const openCreate = () => { setEditingProduct(null); setFormData(defaultProduct); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setFormData(p); setFormOpen(true); };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingProduct) await updateProduct(editingProduct.id, formData);
      else await addProduct(formData);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const SortHeader = ({ field, children }: { field: keyof Product; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventories</h1>
          <p className="text-sm text-muted-foreground">{products.length} total records</p>
          {isLoading && <p className="text-xs text-muted-foreground mt-1">Loading…</p>}
          {!isLoading && error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />Add Inventory</Button>
      </div>

      <FilterBar
        searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search inventories..."
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} statusOptions={statusOpts}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No inventories found" description="Add your first inventory item to get started." icon={<Package className="h-8 w-8 text-muted-foreground" />} action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Inventory</Button>} />
      ) : (
        <div className="rounded-3xl border bg-white overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="name">Name</SortHeader>
                <SortHeader field="category">Category</SortHeader>
                <SortHeader field="vendor">Vendor</SortHeader>
                <SortHeader field="purchaseCost">Cost</SortHeader>
                <SortHeader field="assignedTo">Assigned To</SortHeader>
                <TableHead>Status</TableHead>
                <SortHeader field="warrantyExpiry">Warranty</SortHeader>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.vendor}</TableCell>
                  <TableCell>{formatMoney(p.purchaseCost)}</TableCell>
                  <TableCell>{p.assignedTo}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell>{formatDate(p.warrantyExpiry)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Inventory" : "New Inventory"}</DialogTitle>
          </DialogHeader>
          {isMobile ? (
            <MobileFormSteps
              primaryLabel={editingProduct ? "Save Changes" : "Add Inventory"}
              onPrimary={() => void handleSave()}
              primaryDisabled={saving}
              isLoading={saving}
              onClose={() => setFormOpen(false)}
              steps={[
                {
                  key: "basic",
                  title: "Basic details",
                  canContinue: () => !!formData.name.trim(),
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Item Name</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Category / type</Label>
                        <CreatableSelect
                          value={formData.category}
                          onChange={(category) => setFormData({ ...formData, category })}
                          options={categoryOptions}
                          placeholder="Select or add category…"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Vendor</Label>
                        <CreatableSelect
                          value={formData.vendor}
                          onChange={(vendor) => setFormData({ ...formData, vendor })}
                          options={vendorOptions}
                          placeholder="Select or add vendor…"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Serial Number</Label>
                        <Input value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
                      </div>
                    </>
                  ),
                },
                {
                  key: "purchase",
                  title: "Purchase info",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Purchase Date</Label>
                        <Input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
                      </div>
                      <AmountInput
                        storedUsd={formData.purchaseCost}
                        onChange={(purchaseCost) => setFormData({ ...formData, purchaseCost })}
                      />
                      <div className="grid gap-2">
                        <Label>Warranty Expiry</Label>
                        <Input type="date" value={formData.warrantyExpiry} onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })} />
                      </div>
                    </>
                  ),
                },
                {
                  key: "finish",
                  title: "Finish",
                  content: (
                    <>
                      <div className="grid gap-2">
                        <Label>Assigned To</Label>
                        <Input value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{statusOpts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                      </div>
                    </>
                  ),
                },
              ]}
            />
          ) : null}

          <div className={cn("grid gap-3 mt-1", isMobile && "hidden")}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Item Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>Category / type</Label>
                <CreatableSelect
                  value={formData.category}
                  onChange={(category) => setFormData({ ...formData, category })}
                  options={categoryOptions}
                  placeholder="Select or add category…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Vendor</Label>
                <CreatableSelect
                  value={formData.vendor}
                  onChange={(vendor) => setFormData({ ...formData, vendor })}
                  options={vendorOptions}
                  placeholder="Select or add vendor…"
                />
              </div>
              <div><Label>Serial Number</Label><Input value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Purchase Date</Label><Input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} /></div>
              <AmountInput storedUsd={formData.purchaseCost} onChange={(purchaseCost) => setFormData({ ...formData, purchaseCost })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Warranty Expiry</Label><Input type="date" value={formData.warrantyExpiry} onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })} /></div>
              <div><Label>Assigned To</Label><Input value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as RecordStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOpts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
            <Button onClick={() => void handleSave()} className="w-full" disabled={saving}>
              {saving ? "Saving..." : (editingProduct ? "Save Changes" : "Add Inventory")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
        isLoading={deleting}
        confirmLabel="Delete"
      />
    </div>
  );
}
