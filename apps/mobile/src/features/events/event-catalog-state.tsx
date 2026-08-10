import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';

type EventCatalogState = {
  discoveryCityId: string | undefined;
  inputQuery: string;
  isSearchOpen: boolean;
  selectedCategoryIds: string[];
  setDiscoveryCityId: (cityId: string | undefined) => void;
  setInputQuery: (query: string) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setSelectedCategoryIds: (categoryIds: string[]) => void;
};

const EventCatalogStateContext = createContext<EventCatalogState | undefined>(
  undefined,
);

export function EventCatalogStateProvider({ children }: PropsWithChildren) {
  const [discoveryCityId, setDiscoveryCityId] = useState<string>();
  const [inputQuery, setInputQuery] = useState('');
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  return (
    <EventCatalogStateContext.Provider
      value={{
        discoveryCityId,
        inputQuery,
        isSearchOpen,
        selectedCategoryIds,
        setDiscoveryCityId,
        setInputQuery,
        setSearchOpen,
        setSelectedCategoryIds,
      }}
    >
      {children}
    </EventCatalogStateContext.Provider>
  );
}

export function useEventCatalogState(): EventCatalogState {
  const state = useContext(EventCatalogStateContext);
  if (!state) {
    throw new Error(
      'useEventCatalogState must be used inside EventCatalogStateProvider',
    );
  }
  return state;
}
