
import React, { useState, useCallback, useEffect } from 'react';
import { CodeCartItem, FormMode, FilterType, AppNotification, NotificationType } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import Footer from './components/Footer';
import CodeCartList from './components/CodeCartList';
import Modal from './components/Modal';
import CodeCartForm from './components/CodeCartForm';
import PasswordProtect from './components/PasswordProtect';
import SearchItemModal from './components/SearchItemModal';
import Notification from './components/Notification'; // New component
import FilterControls from './components/FilterControls'; // New component
import { getExampleDate, getItemExpirationStatus } from './utils/dateUtils';

const SESSION_STORAGE_AUTH_KEY = 'codeCartTrackerAuthenticated_v1';
const LOCAL_STORAGE_ITEMS_KEY = 'codeCarts_v3';
const LOCAL_STORAGE_INIT_FLAG_KEY = 'codeCarts_v3_initialized';

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);
const sortItemsFunction = (a: CodeCartItem, b: CodeCartItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

const createExampleData = (): CodeCartItem[] => {
  const baseDate = new Date();
  const items: CodeCartItem[] = [
    {
      id: generateUniqueId(),
      identifier: 'CC-DEMO-01',
      cartType: 'Code Cart',
      location: 'ER BAY 1 (EXAMPLE)',
      employeeInitials: 'SYS',
      drugExpirationDate: getExampleDate(20), // Good
      supplyExpirationDate: getExampleDate(30), // Good
      createdAt: new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateUniqueId(),
      identifier: 'PB-DEMO-02',
      cartType: 'P-Bag',
      location: 'ICU ROOM 5 (EXAMPLE)',
      employeeInitials: 'SYS',
      drugExpirationDate: getExampleDate(10), // Expiring Soon
      supplyExpirationDate: null,
      createdAt: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateUniqueId(),
      identifier: 'CC-DEMO-03',
      cartType: 'Code Cart',
      location: 'OR SUITE A (EXAMPLE)',
      employeeInitials: 'SYS',
      drugExpirationDate: getExampleDate(5), // Urgent
      supplyExpirationDate: getExampleDate(6), // Urgent
      createdAt: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateUniqueId(),
      identifier: 'PB-DEMO-04',
      cartType: 'P-Bag',
      location: 'PEDS WARD (EXAMPLE)',
      employeeInitials: 'SYS',
      drugExpirationDate: getExampleDate(-5), // Expired
      supplyExpirationDate: getExampleDate(60), // Good
      createdAt: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
     {
      id: generateUniqueId(),
      identifier: 'CC-NODEATES',
      cartType: 'Code Cart',
      location: 'STORAGE (EXAMPLE)',
      employeeInitials: 'SYS',
      drugExpirationDate: null, 
      supplyExpirationDate: null, // NA status
      createdAt: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  return items.sort(sortItemsFunction);
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_STORAGE_AUTH_KEY) === 'true';
    }
    return false;
  });
  
  const [codeCartItems, setCodeCartItemsInternal] = useLocalStorage<CodeCartItem[]>(LOCAL_STORAGE_ITEMS_KEY, []);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('add');
  const [editingItem, setEditingItem] = useState<CodeCartItem | null>(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  type FormActionContext = 'addNew' | 'editFromCard' | 'editAfterSearch';
  const [formActionContext, setFormActionContext] = useState<FormActionContext>('addNew');
  
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (isAuthenticated && isInitialLoad) {
      const initialized = localStorage.getItem(LOCAL_STORAGE_INIT_FLAG_KEY);
      if (!initialized && codeCartItems.length === 0) {
        const examples = createExampleData();
        setCodeCartItemsInternal(examples);
        localStorage.setItem(LOCAL_STORAGE_INIT_FLAG_KEY, 'true');
      }
      setIsInitialLoad(false); 
    }
  }, [isAuthenticated, isInitialLoad, codeCartItems.length, setCodeCartItemsInternal]);


  const showNotification = useCallback((message: string, type: NotificationType, duration: number = 5000) => {
    const newNotification = { id: generateUniqueId(), message, type };
    setNotification(newNotification);
    setTimeout(() => {
      setNotification(current => (current?.id === newNotification.id ? null : current));
    }, duration);
  }, []);

  const handleAuthenticationSuccess = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_AUTH_KEY, 'true');
    }
    setIsAuthenticated(true);
    setIsInitialLoad(true); 
    showNotification('Successfully logged in!', 'success');
  }, [showNotification]);

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
    }
    setIsAuthenticated(false);
    setSearchTerm('');
    setActiveStatusFilter('all');
    showNotification('Logged out successfully.', 'info');
  }, [showNotification]);

  const openFormModalForAdd = useCallback(() => {
    setModalMode('add');
    setEditingItem(null);
    setFormActionContext('addNew');
    setIsFormModalOpen(true);
  }, []);
  
  const openFormModalForEditFromCard = useCallback((item: CodeCartItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormActionContext('editFromCard');
    setIsFormModalOpen(true);
  }, []);

  const handleFindAndOpenForUpdate = useCallback((identifierToSearch: string): boolean => {
    const itemToUpdate = codeCartItems.find(
      item => item.identifier.toUpperCase() === identifierToSearch.toUpperCase().trim()
    );
    if (itemToUpdate) {
      setModalMode('edit');
      setEditingItem(itemToUpdate);
      setFormActionContext('editAfterSearch');
      setIsSearchModalOpen(false); 
      setIsFormModalOpen(true);    
      return true;
    }
    // Error is handled within SearchItemModal for not found
    return false; 
  }, [codeCartItems]);

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setEditingItem(null); 
  }, []);
  
  const closeSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);


  const handleSaveItem = useCallback((formDataFromForm: Omit<CodeCartItem, 'id' | 'createdAt'> | CodeCartItem) => {
    const submissionIdentifierFromForm = (formDataFromForm.identifier || '').trim().toUpperCase();
    const processedLocation = (formDataFromForm.location || 'N/A').trim().toUpperCase();
    const processedInitials = (formDataFromForm.employeeInitials || '').trim().toUpperCase();

    if (!processedInitials) {
      showNotification("Employee Initials are required.", 'error');
      return;
    }
    if (!processedLocation) {
       showNotification("Location is required.", 'error');
       return;
    }
    if (!formDataFromForm.drugExpirationDate && !formDataFromForm.supplyExpirationDate) {
      showNotification("At least one expiration date (Drug or Supply) must be provided.", 'error');
      return;
    }
    if (!/^[A-Z]{2,3}$/.test(processedInitials)) {
        showNotification("Employee Initials must be 2 or 3 uppercase letters (e.g., JD or JAD).", 'error');
        return;
    }

    let successMessage = '';
    let proceedWithSave = true;

    setCodeCartItemsInternal(prevItems => {
      let updatedItems = [...prevItems];
      let itemToSave: CodeCartItem;

      if (formActionContext === 'addNew') {
        if (!submissionIdentifierFromForm) {
           showNotification("Cart/P-Bag ID cannot be empty for a new item.", 'error');
           proceedWithSave = false;
           return prevItems;
        }
        const existingByIdentifier = prevItems.find(i => i.identifier.toUpperCase() === submissionIdentifierFromForm);
        if (existingByIdentifier) {
          showNotification(`Error: An item with ID "${submissionIdentifierFromForm}" already exists. Please use a unique ID.`, 'error');
          proceedWithSave = false;
          return prevItems;
        }
        itemToSave = {
          ...(formDataFromForm as Omit<CodeCartItem, 'id' | 'createdAt'>),
          identifier: submissionIdentifierFromForm,
          location: processedLocation,
          employeeInitials: processedInitials,
          id: generateUniqueId(),
          createdAt: new Date().toISOString(),
        };
        updatedItems = [itemToSave, ...prevItems];
        successMessage = `Item "${submissionIdentifierFromForm}" added successfully.`;

      } else if (formActionContext === 'editFromCard' && editingItem) {
         if (!submissionIdentifierFromForm) {
           showNotification("Cart/P-Bag ID cannot be empty when editing.", 'error');
           proceedWithSave = false;
           return prevItems;
        }
        if (submissionIdentifierFromForm.toUpperCase() !== editingItem.identifier.toUpperCase()) {
          const conflictingItem = prevItems.find(
            i => i.id !== editingItem.id && i.identifier.toUpperCase() === submissionIdentifierFromForm
          );
          if (conflictingItem) {
            showNotification(`Error: Cannot change ID to "${submissionIdentifierFromForm}" as another item with this ID already exists.`, 'error');
            proceedWithSave = false;
            return prevItems;
          }
        }
        itemToSave = {
          ...editingItem,
          ...(formDataFromForm as CodeCartItem), 
          identifier: submissionIdentifierFromForm,
          location: processedLocation,
          employeeInitials: processedInitials,
          createdAt: new Date().toISOString(), 
        };
        updatedItems = prevItems.map(i => i.id === editingItem.id ? itemToSave : i);
        successMessage = `Item "${itemToSave.identifier}" updated successfully.`;
      
      } else if (formActionContext === 'editAfterSearch' && editingItem) {
        itemToSave = {
          ...editingItem, 
          cartType: formDataFromForm.cartType,
          location: processedLocation,
          employeeInitials: processedInitials,
          drugExpirationDate: formDataFromForm.drugExpirationDate,
          supplyExpirationDate: formDataFromForm.supplyExpirationDate,
          createdAt: new Date().toISOString(),
        };
        updatedItems = prevItems.map(i => i.id === editingItem.id ? itemToSave : i);
        successMessage = `Item "${itemToSave.identifier}" updated successfully.`;
      } else {
        console.error("Invalid formActionContext or missing editingItem for edit action.");
        showNotification("An unexpected error occurred. Could not save item.", 'error');
        proceedWithSave = false; 
        return prevItems;
      }
      
      return updatedItems.sort(sortItemsFunction);
    });

    if (proceedWithSave && successMessage) {
      showNotification(successMessage, 'success');
      closeFormModal();
    }
  }, [formActionContext, editingItem, closeFormModal, setCodeCartItemsInternal, showNotification]);

  const handleDeleteItem = useCallback(async (id: string) => {
    // Find item to include its identifier in the confirmation and success messages
    const itemToDelete = codeCartItems.find(item => item.id === id);
    const itemName = itemToDelete ? `"${itemToDelete.identifier}"` : "this item";

    if (window.confirm(`Are you sure you want to delete ${itemName}? This action cannot be undone.`)) {
      setCodeCartItemsInternal(prevItems => prevItems.filter(item => item.id !== id));
      showNotification(`Item ${itemName} deleted successfully.`, 'info');
    }
  }, [setCodeCartItemsInternal, codeCartItems, showNotification]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const itemCountsByStatus = React.useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: codeCartItems.length,
      goodAndNa: 0,
      expiringSoon: 0,
      urgent: 0,
      expired: 0,
    };
    codeCartItems.forEach(item => {
      const status = getItemExpirationStatus(item.drugExpirationDate, item.supplyExpirationDate);
      if (status === 'good' || status === 'na') counts.goodAndNa++;
      else if (status === 'expiringSoon') counts.expiringSoon++;
      else if (status === 'urgent') counts.urgent++;
      else if (status === 'expired') counts.expired++;
    });
    return counts;
  }, [codeCartItems]);


  const filteredItems = codeCartItems.filter(item => {
    // Filter by status first
    if (activeStatusFilter !== 'all') {
      const status = getItemExpirationStatus(item.drugExpirationDate, item.supplyExpirationDate);
      if (activeStatusFilter === 'goodAndNa' && !(status === 'good' || status === 'na')) {
        return false;
      }
      if (activeStatusFilter === 'expiringSoon' && status !== 'expiringSoon') {
        return false;
      }
      if (activeStatusFilter === 'urgent' && status !== 'urgent') {
        return false;
      }
      if (activeStatusFilter === 'expired' && status !== 'expired') {
        return false;
      }
    }

    // Then filter by search term
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true; // If no search term, item passes if it passed status filter
    
    return (
      item.identifier.toLowerCase().includes(term) ||
      item.cartType.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      item.employeeInitials.toLowerCase().includes(term)
    );
  });

  const getFormModalTitle = () => {
    if (modalMode === 'add' && formActionContext === 'addNew') return 'Add New Item';
    if (modalMode === 'edit') {
      if (formActionContext === 'editFromCard') return `Edit Item (ID: ${editingItem?.identifier || ''})`;
      if (formActionContext === 'editAfterSearch') return `Update Item (ID: ${editingItem?.identifier || ''})`;
    }
    return 'Manage Item'; 
  };


  if (!isAuthenticated) {
    // Pass showNotification to PasswordProtect if it needs to show global notifications
    return <PasswordProtect onAuthSuccess={handleAuthenticationSuccess} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <Header 
        onAddNew={openFormModalForAdd}
        onUpdateExisting={() => setIsSearchModalOpen(true)}
        onLogout={handleLogout} 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterControls 
            activeFilter={activeStatusFilter}
            onFilterChange={setActiveStatusFilter}
            itemCounts={itemCountsByStatus}
        />
        <CodeCartList
          items={filteredItems}
          onEdit={openFormModalForEditFromCard} 
          onDelete={handleDeleteItem}
          isFiltered={searchTerm.length > 0 || activeStatusFilter !== 'all'}
          originalItemCount={codeCartItems.length}
        />
      </main>

      {isSearchModalOpen && (
        <SearchItemModal
          isOpen={isSearchModalOpen}
          onClose={closeSearchModal}
          onFind={handleFindAndOpenForUpdate}
        />
      )}

      {isFormModalOpen && (
         <Modal
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          title={getFormModalTitle()}
        >
          <CodeCartForm 
            mode={modalMode}
            initialData={editingItem}
            onSubmit={handleSaveItem}
            onCancel={closeFormModal}
            formContext={formActionContext}
            isIdentifierDisabled={formActionContext === 'editAfterSearch'}
          />
        </Modal>
      )}
      
      <Footer />
    </div>
  );
};

export default App;