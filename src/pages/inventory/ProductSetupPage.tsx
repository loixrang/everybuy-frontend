import { useState, useEffect, useId, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchProductById,
  fetchCategories,
  fetchBrands,
  createProduct,
  updateProduct,
} from '../../lib/api/products';
import { ApiError } from '../../lib/api/client';
import { AlertCircleIcon } from '../../components/ui/Icons';
import { BackNavigation } from '../../components/ui/BackNavigation';
import type { Category, Brand, PackName } from '../../types/product';

const PACK_NAMES: PackName[] = [
  'Small Pack',
  'Twin Pack',
  'Jumbo Pack',
  'Wipes',
  'Pad',
  'Tissue',
];

export function ProductSetupPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const nameId = useId();
  const brandSelectId = useId();
  const categorySelectId = useId();
  const packNameSelectId = useId();
  const sizeId = useId();
  const piecesId = useId();
  const packsPerBagId = useId();
  const retailPriceId = useId();
  const bagPriceId = useId();
  const costPerPackId = useId();
  const activeSelectId = useId();

  // Form values
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [packName, setPackName] = useState<PackName>('Small Pack');
  const [size, setSize] = useState('');
  const [piecesPerPack, setPiecesPerPack] = useState('');
  const [packsPerBag, setPacksPerBag] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [bagPrice, setBagPrice] = useState('');
  const [costPerPack, setCostPerPack] = useState('');
  const [initialCostPerPack, setInitialCostPerPack] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  // Reference lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // States
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          fetchCategories(),
          fetchBrands(),
        ]);

        if (ignore) return;
        // Inactive catalog records remain visible on management screens only.
        const activeCategories = catsRes.filter((category) => category.active);
        const activeBrands = brandsRes.filter((brand) => brand.active);
        setCategories(activeCategories);
        setBrands(activeBrands);

        // Pre-select first category and brand if creating
        if (!isEdit) {
          if (activeCategories.length > 0) setCategoryId(activeCategories[0].id);
          if (activeBrands.length > 0) setBrandId(activeBrands[0].id);
        }

        // If editing, load the existing product
        if (isEdit && id) {
          const prod = await fetchProductById(id);
          if (ignore) return;
          if (prod) {
            setName(prod.name);
            setBrandId(prod.brandId);
            setCategoryId(prod.categoryId);
            setPackName(prod.packName);
            setSize(prod.size || '');
            setPiecesPerPack(prod.piecesPerPack ? String(prod.piecesPerPack) : '');
            setPacksPerBag(String(prod.packsPerBag));
            setRetailPrice(prod.retailPrice);
            setBagPrice(prod.bagPrice);
            setCostPerPack(prod.costPerPack ?? '');
            setInitialCostPerPack(prod.costPerPack);
            setActive(prod.active);
          } else {
            setFormError('Product not found.');
          }
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setFormError(err.message);
        } else {
          setFormError('Failed to load form dependencies.');
        }
      } finally {
        if (!ignore) {
          setLoadingData(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Product name is required';
    }
    if (!brandId) {
      errors.brandId = 'Brand is required';
    }
    if (!categoryId) {
      errors.categoryId = 'Category is required';
    }
    const bagNum = parseInt(packsPerBag, 10);
    if (isNaN(bagNum) || bagNum <= 0) {
      errors.packsPerBag = 'Packs per bag must be a positive integer';
    }
    if (piecesPerPack) {
      const pNum = parseInt(piecesPerPack, 10);
      if (isNaN(pNum) || pNum <= 0) {
        errors.piecesPerPack = 'Pieces per pack must be greater than zero';
      }
    }
    const retailNum = parseFloat(retailPrice);
    if (isNaN(retailNum) || retailNum <= 0) {
      errors.retailPrice = 'Pack price must be greater than zero';
    }
    const bagPriceNum = parseFloat(bagPrice);
    if (isNaN(bagPriceNum) || bagPriceNum <= 0) {
      errors.bagPrice = 'Bag price must be greater than zero';
    }
    const costTrimmed = costPerPack.trim();
    if (costTrimmed && !/^(?=.*[1-9])\d{1,10}(\.\d{1,4})?$/.test(costTrimmed)) {
      errors.costPerPack = 'Enter a positive acquisition cost with up to 4 decimal places.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        brandId,
        categoryId,
        packName,
        size: size.trim() || null,
        piecesPerPack: piecesPerPack ? parseInt(piecesPerPack, 10) : null,
        packsPerBag: parseInt(packsPerBag, 10),
        retailPrice: String(parseFloat(retailPrice)),
        bagPrice: String(parseFloat(bagPrice)),
        active,
        ...(costPerPack.trim() &&
        (!isEdit || costPerPack.trim() !== (initialCostPerPack ?? ''))
          ? { costPerPack: costPerPack.trim() }
          : {}),
      };

      if (isEdit && id) {
        await updateProduct(id, payload);
        navigate(`/inventory/${id}`);
      } else {
        const created = await createProduct(payload);
        navigate(created?.id ? `/inventory/${created.id}` : '/inventory');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setFormError('Permission denied: Only shop owners can create or edit products.');
        } else if (err.status === 401) {
          setFormError('Authentication required: Please sign in as an owner.');
        } else {
          setFormError(err.message || 'Failed to save product.');
        }
      } else {
        setFormError('Network error: Unable to save product.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="h-4 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-8 w-48 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-96 rounded-[12px] bg-[color:var(--color-subtle)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back breadcrumb */}
      <div>
        <BackNavigation fallback={isEdit && id ? `/inventory/${id}` : '/inventory'} label={isEdit ? 'Back to product' : 'Back to inventory'} />
      </div>

      {/* Page Heading */}
      <div>
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
          {isEdit ? 'Edit product' : 'Product setup'}
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Define pack and bag units before receiving stock.
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[color:var(--color-danger-ink)]">
                Unable to save
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-0.5">
                {formError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
          Product details
        </h2>

        {/* Row 1: Product Name & Pack Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={nameId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Product name *
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Molfix baby diapers"
              className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                validationErrors.name ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
              }`}
            />
            {validationErrors.name && (
              <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor={packNameSelectId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Pack type *
            </label>
            <select
              id={packNameSelectId}
              value={packName}
              onChange={(e) => setPackName(e.target.value as PackName)}
              className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            >
              {PACK_NAMES.map((pn) => (
                <option key={pn} value={pn}>
                  {pn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Brand & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor={brandSelectId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Brand *
            </label>
            <select
              id={brandSelectId}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                validationErrors.brandId ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
              }`}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {validationErrors.brandId && (
              <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.brandId}</p>
            )}
          </div>

          <div>
            <label htmlFor={categorySelectId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Category *
            </label>
            <select
              id={categorySelectId}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                validationErrors.categoryId ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
              }`}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {validationErrors.categoryId && (
              <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.categoryId}</p>
            )}
          </div>
        </div>

        {/* Row 3: Size/Variant & Pieces per pack */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor={sizeId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Size / variant
            </label>
            <input
              id={sizeId}
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="e.g. Size 3"
              className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor={piecesId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Pieces per pack
            </label>
            <input
              id={piecesId}
              type="number"
              min="1"
              value={piecesPerPack}
              onChange={(e) => setPiecesPerPack(e.target.value)}
              placeholder="e.g. 48"
              className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                validationErrors.piecesPerPack ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
              }`}
            />
            {validationErrors.piecesPerPack && (
              <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.piecesPerPack}</p>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Base stock unit
            </span>
            <input
              type="text"
              value="Pack (standard)"
              disabled
              className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[color:var(--color-muted)] text-sm cursor-not-allowed"
            />
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border)] pt-4">
          <h2 className="text-lg font-bold text-[color:var(--color-ink)] mb-4">
            Bags & prices
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor={packsPerBagId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
                Packs per bag *
              </label>
              <input
                id={packsPerBagId}
                type="number"
                min="1"
                value={packsPerBag}
                onChange={(e) => setPacksPerBag(e.target.value)}
                placeholder="e.g. 6"
                className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                  validationErrors.packsPerBag ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
                }`}
              />
              {validationErrors.packsPerBag && (
                <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.packsPerBag}</p>
              )}
            </div>

            <div>
              <label htmlFor={retailPriceId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
                Pack price (₦) *
              </label>
              <input
                id={retailPriceId}
                type="number"
                step="any"
                min="0.01"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="e.g. 4500"
                className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                  validationErrors.retailPrice ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
                }`}
              />
              {validationErrors.retailPrice && (
                <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.retailPrice}</p>
              )}
            </div>

            <div>
              <label htmlFor={bagPriceId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
                Bag price (₦) *
              </label>
              <input
                id={bagPriceId}
                type="number"
                step="any"
                min="0.01"
                value={bagPrice}
                onChange={(e) => setBagPrice(e.target.value)}
                placeholder="e.g. 26000"
                className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                  validationErrors.bagPrice ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
                }`}
              />
              {validationErrors.bagPrice && (
                <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.bagPrice}</p>
              )}
            </div>
          </div>

          <div className="mt-4 max-w-md">
            <label htmlFor={costPerPackId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Acquisition cost per pack (₦) · optional
            </label>
            <input
              id={costPerPackId}
              type="text"
              inputMode="decimal"
              value={costPerPack}
              onChange={(e) => setCostPerPack(e.target.value)}
              placeholder="What you paid for one pack"
              aria-describedby={`${costPerPackId}-help`}
              className={`w-full h-[46px] px-3 rounded-[8px] border bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors ${
                validationErrors.costPerPack ? 'border-[color:var(--color-danger-ink)]' : 'border-[color:var(--color-border)]'
              }`}
            />
            <p id={`${costPerPackId}-help`} className="text-xs text-[color:var(--color-muted)] mt-1">
              This is your acquisition cost, separate from pack and bag selling prices. Set it for existing stock only when you know its value; leaving it blank does not change an existing cost.
            </p>
            {validationErrors.costPerPack && (
              <p className="text-xs text-[color:var(--color-danger-ink)] mt-1">{validationErrors.costPerPack}</p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor={activeSelectId} className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
              Product status
            </label>
            <select
              id={activeSelectId}
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
              className="w-full md:w-48 h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Info banner matching design */}
        <div className="p-4 rounded-[8px] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)] flex items-start gap-3">
          <AlertCircleIcon size={20} className="shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold">Bag rules and permissions</p>
            <p className="mt-0.5">
              Pack price is the retail selling price. Bag price applies to wholesale bag orders.
              Product creation and modifications are guarded by Owner authorization on the server.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to={isEdit && id ? `/inventory/${id}` : '/inventory'}
            className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  );
}
