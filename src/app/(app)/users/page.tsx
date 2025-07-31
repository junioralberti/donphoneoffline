
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UserForm } from '@/components/users/user-form';
import { UsersTable } from '@/components/users/users-table';
import { addUser, getUsers, updateUser, deleteUser, getUserById } from '@/services/userService';
import type { User, CreateUserFormData } from '@/lib/schemas/user';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function UsersPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { firestoreUser } = useAuth(); // Get current user from auth context

  const { data: users, isLoading, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { mutate: addUserMutation, isPending: isAdding } = useMutation({
    mutationFn: (userData: CreateUserFormData) => addUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Usuário Adicionado", description: "O novo usuário foi adicionado com sucesso." });
      setIsSheetOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Adicionar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: updateUserMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, userData }: { id: string, userData: Partial<User> }) => updateUser(id, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Usuário Atualizado", description: "Os dados do usuário foram atualizados." });
      setIsSheetOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: deleteUserMutation, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Usuário Excluído", description: "O usuário foi removido permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: User | CreateUserFormData) => {
    if ('id' in data && data.id) { // This is a User object (editing)
      updateUserMutation.mutate({ id: data.id, userData: data });
    } else { // This is CreateUserFormData (adding)
      addUserMutation.mutate(data as CreateUserFormData);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Prevent admin from deleting themselves
    if (firestoreUser?.id === id) {
      toast({
        title: "Ação Inválida",
        description: "Você não pode excluir seu próprio usuário.",
        variant: "destructive",
      });
      return;
    }
    deleteUserMutation(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Gerenciar Usuários</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedUser(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{selectedUser ? "Editar Usuário" : "Adicionar Novo Usuário"}</SheetTitle>
              <SheetDescription>
                {selectedUser ? "Altere os dados do usuário abaixo." : "Preencha os dados do novo usuário."}
              </SheetDescription>
            </SheetHeader>
            <UserForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedUser || undefined}
              isEditing={!!selectedUser}
              isLoading={isAdding || isUpdating}
            />
          </SheetContent>
        </Sheet>
      </div>

      {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {error && <div className="text-destructive text-center py-12">Erro ao carregar usuários: {error.message}</div>}
      {!isLoading && !error && (
        <UsersTable
          users={users || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoadingDeleteForId={isDeleting ? deletingId : null}
          currentUserId={firestoreUser?.id}
        />
      )}
    </div>
  );
}
