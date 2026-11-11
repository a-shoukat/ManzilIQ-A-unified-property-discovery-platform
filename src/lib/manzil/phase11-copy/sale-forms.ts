/** Phase 11 dealer sale forms — app chrome via i18n (dealer namespace).
 * Printed form field labels stay hard-coded Urdu in DealerSaleFormSheet. */
import i18n from '@/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'dealer' });

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
  get newForm() {
    return t('saleFormsNew');
  },
  get formSettings() {
    return t('saleFormsFormSettings');
  },
  get dealerHub() {
    return t('saleFormsDealerHub');
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
  get reset() {
    return t('saleFormsReset');
  },
  get uploadLogo() {
    return t('saleFormsUploadLogo');
  },
  get removeLogo() {
    return t('saleFormsRemoveLogo');
  },
  get livePreview() {
    return t('saleFormsLivePreview');
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
} as const;
