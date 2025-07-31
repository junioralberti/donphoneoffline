
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/components/products/product-form';
import { ProductsTable } from '@/components/products/products-table';
import { addProduct, getProducts, updateProduct, deleteProduct } from '@/services/productService';
import type { Product } from '@/lib/schemas/product';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProductsPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading, error } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { mutate: addProductMutation, isPending: isAdding } = useMutation({
    mutationFn: ({ productData, imageFile }: { productData: Product, imageFile?: File | null }) => addProduct(productData, imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Produto Adicionado", description: "O novo produto foi adicionado com sucesso." });
      setIsSheetOpen(false);
      setSelectedProduct(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Adicionar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: updateProductMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, productData, imageFile }: { id: string, productData: Product, imageFile?: File | null }) => updateProduct(id, productData, imageFile, productData.imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Produto Atualizado", description: "Os dados do produto foram atualizados." });
      setIsSheetOpen(false);
      setSelectedProduct(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: deleteProductMutation, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Produto Excluído", description: "O produto foi removido permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: Product, imageFile?: File | null) => {
    if (selectedProduct && selectedProduct.id) {
      updateProductMutation({ id: selectedProduct.id, productData: data, imageFile });
    } else {
      addProductMutation({ productData: data, imageFile });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    deleteProductMutation(id);
  };

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Gerenciar Produtos</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedProduct(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{selectedProduct ? "Editar Produto" : "Adicionar Novo Produto"}</SheetTitle>
              <SheetDescription>
                {selectedProduct ? "Altere os dados do produto abaixo." : "Preencha os dados do novo produto para adicioná-lo ao sistema."}
              </SheetDescription>
            </SheetHeader>
            <ProductForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedProduct || undefined}
              isEditing={!!selectedProduct}
              isLoading={isAdding || isUpdating}
            />
          </SheetContent>
        </Sheet>
      </div>

       <div className="mb-4">
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <div className="text-destructive text-center py-12">Erro ao carregar produtos: {error.message}</div>}
      {!isLoading && !error && (
        <ProductsTable
          products={filteredProducts || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoadingDeleteForId={isDeleting ? deletingId : null}
        />
      )}
    </div>
  );
}
