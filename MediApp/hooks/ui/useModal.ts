import { useState, useCallback } from 'react';

export type ModalType = 'success' | 'error' | 'info';

interface UseModalReturn {
  modalVisible: boolean;
  modalType: ModalType;
  modalTitle: string;
  modalMessage: string;
  modalAction: (() => void) | undefined;
  modalActionText: string | undefined;
  modalOnClose: (() => void) | undefined;
  showModal: (
    type: ModalType,
    title: string,
    message: string,
    closeHandler?: () => void,
    action?: () => void,
    actionText?: string
  ) => void;
  hideModal: () => void;
  modalProps: {
    visible: boolean;
    title: string;
    message: string;
    type: ModalType;
    onClose: (() => void) | undefined;
    onAction: (() => void) | undefined;
    actionText: string | undefined;
  };
}

export const useModal = (): UseModalReturn => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<(() => void) | undefined>(
    undefined
  );
  const [modalActionText, setModalActionText] = useState<string | undefined>(
    undefined
  );
  const [modalOnClose, setModalOnClose] = useState<(() => void) | undefined>(
    () => () => setModalVisible(false)
  );

  const showModal = useCallback(
    (
      type: ModalType,
      title: string,
      message: string,
      closeHandler?: () => void,
      action?: () => void,
      actionText?: string
    ) => {
      // Set all modal properties before showing it
      setModalType(type);
      setModalTitle(title);
      setModalMessage(message);
      setModalOnClose(closeHandler || (() => setModalVisible(false)));
      setModalAction(action);
      setModalActionText(actionText);

      // Use a small timeout to ensure state updates don't conflict with rendering
      setTimeout(() => {
        setModalVisible(true);
      }, 0);
    },
    []
  );

  const hideModal = useCallback(() => {
    setModalVisible(false);

    // Clear modal state after a short delay to allow animation to complete
    setTimeout(() => {
      setModalType('info');
      setModalTitle('');
      setModalMessage('');
      setModalAction(undefined);
      setModalActionText(undefined);
      setModalOnClose(() => setModalVisible(false)); // Provide a default close handler instead of undefined
    }, 300);
  }, []);

  const modalProps = {
    visible: modalVisible,
    title: modalTitle,
    message: modalMessage,
    type: modalType,
    onClose: modalOnClose,
    onAction: modalAction,
    actionText: modalActionText,
  };

  return {
    modalVisible,
    modalType,
    modalTitle,
    modalMessage,
    modalAction,
    modalActionText,
    modalOnClose,
    showModal,
    hideModal,
    modalProps,
  };
};
