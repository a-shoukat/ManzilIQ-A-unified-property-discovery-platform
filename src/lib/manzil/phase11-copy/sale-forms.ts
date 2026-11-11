/** Phase 11 dealer sale forms — app chrome via i18n (dealer namespace).
 * Printed form field labels stay hard-coded Urdu in DealerSaleFormSheet. */
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'dealer', ...(opts ?? {}) });

export const SALE_FORMS_COPY = {
  get settingsTitle() {
    return t('saleFormsSettingsTitle');
  },
  get settingsSubtitle() {
    return t('saleFormsSettingsSubtitle');
  },
  get formsTitle() {
    return t('saleFormsTitle');
  },
  get formsSubtitle() {
    return t('saleFormsSubtitle');
  },
  listSubtitle: (count: number) => t('saleFormsListSubtitle', { count }),
  get newForm() {
    return t('saleFormsNew');
  },
  get formSettings() {
    return t('saleFormsFormSettings');
  },
  get headerSettings() {
    return t('saleFormsHeaderSettings');
  },
  get dealerHub() {
    return t('saleFormsDealerHub');
  },
  get portal() {
    return t('saleFormsPortal');
  },
  get formsLink() {
    return t('saleFormsFormsLink');
  },
  get leads() {
    return t('saleFormsLeads');
  },
  get save() {
    return t('saleFormsSave');
  },
  get saving() {
    return t('saleFormsSaving');
  },
  get saved() {
    return t('saleFormsSaved');
  },
  get settingsSaved() {
    return t('saleFormsSettingsSaved');
  },
  get reset() {
    return t('saleFormsReset');
  },
  get resetKept() {
    return t('saleFormsResetKept');
  },
  get uploadLogo() {
    return t('saleFormsUploadLogo');
  },
  get removeLogo() {
    return t('saleFormsRemoveLogo');
  },
  get logoUploaded() {
    return t('saleFormsLogoUploaded');
  },
  get logoRemoved() {
    return t('saleFormsLogoRemoved');
  },
  get livePreview() {
    return t('saleFormsLivePreview');
  },
  get liveHeaderPreview() {
    return t('saleFormsLiveHeaderPreview');
  },
  get headerFields() {
    return t('saleFormsHeaderFields');
  },
  get headerBg() {
    return t('saleFormsHeaderBg');
  },
  get accent() {
    return t('saleFormsAccent');
  },
  get nextSerial() {
    return t('saleFormsNextSerial');
  },
  get showManagerSig() {
    return t('saleFormsShowManagerSig');
  },
  get loading() {
    return t('saleFormsLoading');
  },
  get empty() {
    return t('saleFormsEmpty');
  },
  get emptyFilter() {
    return t('saleFormsEmptyFilter');
  },
  get search() {
    return t('saleFormsSearch');
  },
  get noPhone() {
    return t('saleFormsNoPhone');
  },
  get statusAll() {
    return t('saleFormsStatusAll');
  },
  get statusDraft() {
    return t('saleFormsStatusDraft');
  },
  get statusIssued() {
    return t('saleFormsStatusIssued');
  },
  get statusCancelled() {
    return t('saleFormsStatusCancelled');
  },
  statusLabel: (status: string) => {
    if (status === 'draft') return t('saleFormsStatusDraft');
    if (status === 'issued') return t('saleFormsStatusIssued');
    if (status === 'cancelled') return t('saleFormsStatusCancelled');
    if (status === 'all') return t('saleFormsStatusAll');
    return status;
  },
  get create() {
    return t('saleFormsCreate');
  },
  get open() {
    return t('saleFormsOpen');
  },
  get duplicate() {
    return t('saleFormsDuplicate');
  },
  get cancel() {
    return t('saleFormsCancel');
  },
  get issue() {
    return t('saleFormsIssue');
  },
  get issuing() {
    return t('saleFormsIssuing');
  },
  get issued() {
    return t('saleFormsIssued');
  },
  get locked() {
    return t('saleFormsLocked');
  },
  get editedFlag() {
    return t('saleFormsEditedFlag');
  },
  get downloadPdf() {
    return t('saleFormsDownloadPdf');
  },
  get downloadPng() {
    return t('saleFormsDownloadPng');
  },
  get printA5() {
    return t('saleFormsPrintA5');
  },
  get printA4() {
    return t('saleFormsPrintA4');
  },
  get share() {
    return t('saleFormsShare');
  },
  get copyLink() {
    return t('saleFormsCopyLink');
  },
  get linkCopied() {
    return t('saleFormsLinkCopied');
  },
  get whatsapp() {
    return t('saleFormsWhatsapp');
  },
  get revokeLink() {
    return t('saleFormsRevokeLink');
  },
  get regenerateLink() {
    return t('saleFormsRegenerateLink');
  },
  get revoked() {
    return t('saleFormsRevoked');
  },
  get loadError() {
    return t('saleFormsLoadError');
  },
  get loadFormError() {
    return t('saleFormsLoadFormError');
  },
  get loadSettingsError() {
    return t('saleFormsLoadSettingsError');
  },
  get invalidSettings() {
    return t('saleFormsInvalidSettings');
  },
  get saveError() {
    return t('saleFormsSaveError');
  },
  get issueError() {
    return t('saleFormsIssueError');
  },
  get cancelError() {
    return t('saleFormsCancelError');
  },
  get logoError() {
    return t('saleFormsLogoError');
  },
  get publicUnavailableTitle() {
    return t('saleFormsPublicUnavailableTitle');
  },
  get publicUnavailableBody() {
    return t('saleFormsPublicUnavailableBody');
  },
  get publicLoading() {
    return t('saleFormsPublicLoading');
  },
  get publicReadOnly() {
    return t('saleFormsPublicReadOnly');
  },
  get verifiedNote() {
    return t('saleFormsVerifiedNote');
  },
  get generateForm() {
    return t('saleFormsGenerateForm');
  },
  get nextSerialHint() {
    return t('saleFormsNextSerialHint');
  },
  get newTitle() {
    return t('saleFormsNewTitle');
  },
  get newFromBooking() {
    return t('saleFormsNewFromBooking');
  },
  get newBlank() {
    return t('saleFormsNewBlank');
  },
  get loadingBooking() {
    return t('saleFormsLoadingBooking');
  },
  detailTitle: (serial: number) => t('saleFormsDetailTitle', { serial }),
  detailStatus: (status: string) => t('saleFormsStatusLabel', { status }),
  get notFound() {
    return t('saleFormsNotFound');
  },
  get superAdminReadonly() {
    return t('saleFormsSuperAdminReadonly');
  },
} as const;
