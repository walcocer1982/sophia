import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../services/api';

const initialState = {
  contacts: [],
  currentContact: null,
  loading: false,
  error: null,
};

export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async () => {
    return await api.getContacts();
  }
);

export const fetchContactById = createAsyncThunk(
  'contacts/fetchContactById',
  async (id) => {
    return await api.getContact(id);
  }
);

export const addContact = createAsyncThunk(
  'contacts/addContact',
  async (contactData) => {
    return await api.createContact(contactData);
  }
);

export const editContact = createAsyncThunk(
  'contacts/editContact',
  async ({ id, contactData }) => {
    return await api.updateContact(id, contactData);
  }
);

export const removeContact = createAsyncThunk(
  'contacts/removeContact',
  async (id) => {
    await api.deleteContact(id);
    return id;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setCurrentContact: (state, action) => {
      state.currentContact = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar contactos';
      })
      
      // Fetch contact by id
      .addCase(fetchContactById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContact = action.payload;
      })
      .addCase(fetchContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar el contacto';
      })
      
      // Add contact
      .addCase(addContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts.push(action.payload);
      })
      .addCase(addContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al agregar contacto';
      })
      
      // Edit contact
      .addCase(editContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editContact.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.contacts.findIndex(contact => contact.id === action.payload.id);
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        state.currentContact = action.payload;
      })
      .addCase(editContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al actualizar contacto';
      })
      
      // Remove contact
      .addCase(removeContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = state.contacts.filter(contact => contact.id !== action.payload);
        if (state.currentContact && state.currentContact.id === action.payload) {
          state.currentContact = null;
        }
      })
      .addCase(removeContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al eliminar contacto';
      });
  },
});

export const { setCurrentContact, clearError } = contactsSlice.actions;
export default contactsSlice.reducer; 