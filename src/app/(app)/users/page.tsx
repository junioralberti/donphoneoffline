
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { PlusCircle, ShieldAlert, Loader2, AlertTriangle, UserX } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { UserForm } from "@/components/users/user-form";
import { UsersTable } from "@/components/users/users-table";
import { getUsers, addUser, updateUser, deleteUser } from "@/services/userService";
import type { User, CreateUserFormData } from "@/lib/schemas/user"; // Import CreateUserFormData
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Define um tipo para os dados que serão realmente salvos na atualização, omitindo a senha.
type UserDataToUpdate = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'password' | 'confirmPassword'>;


export default function UsersPage() {
  const { userRole, isAuthenticated, firebaseUser } = useAuth(); 
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      router.push('/dashboard');
    }
  }, [userRole, isAuthenticated, router]);

  const { data: users, isLoading: isLoadingUsers, error: usersError, refetch: refetchUsers } = useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: isAuthenticated && userRole === 'admin', 
  });

  useEffect(() => {
    if (usersError) {
      toast({
        title: "Erro ao Carregar Usuários",
        description: "Não foi possível buscar os dados dos usuários. Verifique sua conexão ou tente novamente.",
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [usersError, toast]);

  const addUserMutation = useMutation({
    mutationFn: (newUserData: CreateUserFormData) => addUser(newUserData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário Adicionado", description: "Novo usuário adicionado com sucesso." });
      setIsAddUserDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Falha ao adicionar usuário: ${error.message}`, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserDataToUpdate> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Sucesso!", description: "Usuário atualizado com sucesso." });
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Falha ao atualizar usuário: ${error.message}`, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Sucesso!", description: "Usuário excluído com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: `Falha ao excluir usuário: ${error.message}`, variant: "destructive" });
    },
  });

  const handleAddUser = async (data: CreateUserFormData) => {
    await addUserMutation.mutateAsync(data);
  };

  const handleUpdateUser = async (data: User) => {
    if (!editingUser || !editingUser.id) return;
    const { id, createdAt, updatedAt, password, confirmPassword, ...userDataToUpdate } = data;
    await updateUserMutation.mutateAsync({ id: editingUser.id, data: userDataToUpdate });
  };

  const handleDeleteUser = async (userId: string) => {
    if (firebaseUser?.uid === userId) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir seu próprio usuário.",
        variant: "destructive",
      });
      return;
    }
    await deleteUserMutation.mutateAsync(userId);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const UsersListSkeleton = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1.5 w-full">
            <Skeleton className="h-5 w-1/3 rounded bg-muted/50" />
            <Skeleton className="h-3 w-2/3 rounded bg-muted/50" />
            <Skeleton className="h-3 w-1/4 rounded mt-1 bg-muted/50" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9 rounded-md bg-muted/50" />
            <Skeleton className="h-9 w-9 rounded-md bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!isAuthenticated || userRole !== 'admin') {
    if (!isAuthenticated && userRole === null) { 
      return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2 text-muted-foreground">Carregando...</p></div>;
    }
    return (
       <div className="flex flex-col items-center justify-center gap-4 p-6 h-[calc(100vh-theme(spacing.28))]">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-foreground">Acesso Negado</h2>
        <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
        <Button onClick={() => router.push('/dashboard')} className="bg-accent hover:bg-accent/90 text-accent-foreground">Ir para o Painel</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-foreground">Gerenciamento de Usuários</h1>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário.
              </DialogDescription>
            </DialogHeader>
            <UserForm 
              onSubmit={handleAddUser as any} 
              isLoading={addUserMutation.isPending}
              isEditing={false} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Gerencie usuários do sistema e suas funções (Admin/Usuário).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
             <UsersListSkeleton />
          ) : usersError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-destructive">
              <AlertTriangle className="h-12 w-12" />
              <p className="text-lg font-medium">Erro ao carregar usuários</p>
              <p className="text-sm text-muted-foreground">{usersError.message}</p>
              <Button onClick={() => refetchUsers()} className="mt-3" disabled={isLoadingUsers}>
                {isLoadingUsers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <UsersTable 
              users={users || []} 
              onEdit={openEditDialog} 
              onDelete={handleDeleteUser}
              isLoadingDeleteForId={deleteUserMutation.isPending ? deleteUserMutation.variables : null}
              currentUserId={firebaseUser?.uid}
            />
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={isEditUserDialogOpen} onOpenChange={(isOpen) => {
          setIsEditUserDialogOpen(isOpen);
          if (!isOpen) setEditingUser(null);
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
               <DialogDescription>Atualize os dados do usuário selecionado.</DialogDescription>
            </DialogHeader>
            <UserForm 
              onSubmit={handleUpdateUser as any} 
              defaultValues={editingUser} 
              isEditing 
              isLoading={updateUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
