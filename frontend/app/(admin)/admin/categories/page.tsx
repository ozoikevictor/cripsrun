'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit2,
  Trash2,
  FolderOpen,
  GripVertical,
  Check,
  X,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(apiUrl('/api/admin/categories'), { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (!json?.success) {
          setError(json?.error ?? 'Failed to load categories');
          return;
        }

        setCategories(json.data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load categories');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.length - activeCount;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(apiUrl('/api/admin/categories'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          slug: generateSlug(newName),
          description: newDescription.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create category');
      }

      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(apiUrl(`/api/admin/categories/${id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update category');
      }

      setEditingId(null);
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    setIsSaving(true);
    setError(null);

    try {
      if (cat.is_active) {
        const res = await fetch(apiUrl(`/api/admin/categories/${cat.id}`), {
          method: 'DELETE',
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to deactivate category');
        }
      } else {
        const res = await fetch(apiUrl(`/api/admin/categories/${cat.id}`), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to reactivate category');
        }
      }

      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button onClick={() => setShowCreate((current) => !current)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showCreate ? 'Hide Form' : 'Add Category'}
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold">New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Proteins"
              />
              {newName && (
                <p className="text-xs text-muted-foreground">
                  Slug: <code>{generateSlug(newName)}</code>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-desc">Description</Label>
              <Input
                id="new-category-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCreate} disabled={isSaving} size="sm">
              Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">Loading categories…</div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-6 text-center text-destructive">{error}</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                  !cat.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />

                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm max-w-[200px]"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="h-8 text-sm max-w-[250px]"
                        placeholder="Description"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveEdit(cat.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{cat.name}</span>
                        <Badge
                          variant={cat.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {cat.description || 'No description'} · /{cat.slug}
                      </p>
                    </div>
                  )}
                </div>

                {editingId !== cat.id && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(cat)}
                      title={cat.is_active ? 'Deactivate' : 'Reactivate'}
                    >
                      <Trash2
                        className={`h-4 w-4 ${
                          cat.is_active ? 'text-red-500' : 'text-green-500'
                        }`}
                      />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !loading && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground text-center">
        Categories are soft-deleted (deactivated) — they are never permanently removed.
      </p>
    </div>
  );
}
