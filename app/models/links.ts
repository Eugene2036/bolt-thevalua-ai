import type { ValuationType } from './plots.validations';

export const AppLinks = {
  Home: '/',
  Dashboard: '/dashboard',
  DashboardValuers: '/valuers',
  Profile: (id: string) => `/users/${id}`,
  Welcome: '/welcome',
  Login: '/login',
  Logout: '/logout',
  Join: '/join',
  MyAccount: '/my-account',
  CustomerCare: '/customer-care',
  Products: '/products',
  Services: '/services',
  About: '/about',
  Contactus: '/contactus',
  PromptAi: '/prompt-ai',
  PrivacyPolicy: '/privacy-policy',
  TermsOfService: '/terms-of-service',
  TermsOfUse: '/terms-of-use',
  FAQ: '/faq',

  ExportPlots: '/plots/export-plots',
  UnvaluedPlots: '/plots/unvalued-plots',
  ImportComparablesLatest: '/plots/import-comparables-latest',

  YearRangeValues: '/year-range-values',

  ConstructionList: '/construction-calculator',
  ConstructionCalculator: (id: string) => `/construction-calculator/${id}`,
  UpdateRangeValues: `/update-range-values`,

  UserActivity: '/user-activity',
  Users: '/users',
  SetTargets: '/users/set-targets',
  CreateUser: `/users/create`,
  UserProfile: (id: string) => `/users/${id}`,
  EditUser: (id: string) => `/users/${id}/edit`,
  EditUserProfileDetails: (email: string) => `/userProfile/${email}/edit`,

  // InstructorProfile: (id: string) => `/users/${id}`,

  Companies: '/companies',
  CreateCompany: '/companies/create',
  EditCompany: (id: string) => `/companies/${id}/edit`,

  BankerAnalytics: '/instructions/analytics',
  Instructions: '/instructions',
  CreateInstructions: '/instructions/create',
  ViewReportBanker: (plotId: string) => `/valuationreports/${plotId}/view-report`,

  CreateInstructionsClientType: '/instructions/create-client-type',
  CreateInstructionsClientDetails: (clientType: string) => `/instructions/${clientType}/create`,

  EditInstructions: (id: string) => `/instructions/${id}/edit`,
  EditNotifications: (id: string) => `/notifications/${id}/edit`,
  EditBankNotifications: (id: string) => `/instructions/${id}/bank/edit`,
  EditNotificationDetails: (id: string) => `/instructions/edit/${id}`,

  NotificationChat: (noteId: string, userId: string) => `/instructions/${noteId}/${userId}/chat`,

  RptTemplates: (id: string) => `/rpt-templates/${id}`,
  CreateRptTemplate: (id: string) => `/rpt-templates/${id}/create`,
  EditRptTemplate: (companyId: string, templateId: string) => `/rpt-templates/${companyId}/${templateId}/edit`,

  ReportTemplates: (id: string) => `/reporttemplates/${id}`,
  CreateReportTemplate: (id: string) => `/reporttemplates/${id}/create`,
  EditReportTemplate: (id: string) => `/reporttemplates/${id}/edit`,

  ReportHeaders: (id: string) => `/reporttemplates/${id}`,
  EditReportHeader: (id: string) => `/reportheader/${id}/edit`,

  ReportSubHeaders: (id: string) => `/reportsubheader/${id}`,
  CreateReportSubHeader: (id: string) => `/reportsubheader/${id}/create`,
  EditReportSubHeader: (id: string) => `/reportsubheader/${id}/edit`,

  CreateReportBodyContent: (sheaderid: string) => `/reportbodycontent/${sheaderid}/create`,
  EditReportBodyContent: (id: string, sheaderid: string) => `/reportbodycontent/${id}/${sheaderid}/edit`,


  // UserGroups: `/usergroups`,
  UserGroups: (id: string) => `/usergroups/${id}`,
  CreateUserGroup: '/usergroups/create',
  EditUserGroup: (id: string) => `/usergroups/${id}/edit`,

  CouncilValuationType: '/plots/council-valuation-type',

  SearchCouncilPlot: (valuationType: ValuationType) => `/plots/search-council-plot?valuationType=${valuationType}`,
  ValuedCouncilPlots: `/plots/valued-council-plots`,

  UpdateStoredValue: (id: string) => `/plots/${id}/update-stored-value`,
  UpdateValuerComments: (id: string) => `/plots/${id}/update-valuer-comments`,
  UpdateAnalysisDate: (id: string) => `/plots/${id}/update-analysis-date`,
  UpdateInspectionDate: (id: string) => `/plots/${id}/update-inspection-date`,
  UpdatePlotSize: (id: string) => `/plots/${id}/update-plot-size`,
  ImportTenants: (id: string) => `/plots/${id}/import-from-excel`,
  BackupTenants: (id: string) => `/plots/${id}/export-tenants`,

  AddTenant: '/tenants/add',
  UpdateTenantDetails: (id: string) => `/tenants/${id}/update-details`,
  DeleteTenant: (id: string) => `/tenants/${id}/delete`,

  AddParking: '/parkings/add',
  UpdateParkingDetails: (id: string) => `/parkings/${id}/update-details`,
  DeleteParking: (id: string) => `/parkings/${id}/delete`,

  AddGrc: '/grc/add',
  UpdateGrcDetails: (id: string) => `/grc/${id}/update-details`,
  DeleteGrc: (id: string) => `/grc/${id}/delete`,

  AddMV: '/mv/add',
  UpdateMVDetails: (id: string) => `/mv/${id}/update-details`,
  DeleteMV: (id: string) => `/mv/${id}/delete`,

  AddGrcFee: '/grc-fee/add',
  UpdateGrcFeeDetails: (id: string) => `/grc-fee/${id}/update-details`,
  DeleteGrcFee: (id: string) => `/grc-fee/${id}/delete`,

  AddGrcDepr: '/grc-depr/add',
  UpdateGrcDeprDetails: (id: string) => `/grc-depr/${id}/update-details`,
  DeleteGrcDepr: (id: string) => `/grc-depr/${id}/delete`,

  AddOutgoing: '/outgoings/add',
  UpdateOutgoingDetails: (id: string) => `/outgoings/${id}/update-details`,
  DeleteOutgoing: (id: string) => `/outgoings/${id}/delete`,

  AddInsurance: '/insurance/add',
  UpdateInsuranceDetails: (id: string) => `/insurance/${id}/update-details`,
  DeleteInsurance: (id: string) => `/insurance/${id}/delete`,

  AddRecord: '/add-record',
  UpdateRecord: '/update-record',
  DeleteRecord: '/delete-record',

  AddStandardOutgoings: '/add-standard-outgoings',

  Plots: '/plots',
  Plot: (id: string) => `/plots/${id}`,

  PlotSummary: (id: string) => `/plots/${id}/summary`,
  PlotValuations: (id: string) => `/plots/${id}/valuations`,
  PlotIncome: (id: string) => `/plots/${id}/income-and-outgoings`,
  PlotDCF: (id: string) => `/plots/${id}/dcf`,
  PlotInsurance: (id: string) => `/plots/${id}/insurance`,
  PlotComparables: (id: string) => `/plots/${id}/comparables`,

  PlotResSummary: (id: string) => `/plots/${id}/summary-res`,
  PlotGrc: (id: string) => `/plots/${id}/grc`,
  PlotMV: (id: string) => `/plots/${id}/mv`,

  PlotCouncilResSummary: (id: string) => `/plots/${id}/council-summary-res`,
  PlotCouncilGrc: (id: string) => `/plots/${id}/council-grc`,
  PlotCouncilMV: (id: string) => `/plots/${id}/council-mv`,
  PlotRatingCard: (id: string) => `/plots/${id}/council-card`,

  PlotCouncilGrcReadOnly: (id: string, isReadOnly: boolean) => `/plots/${id}/${isReadOnly}/council-grc`,
  PlotValuationsReadOnly: (id: string, isReadOnly: boolean) => `/plots/${id}/${isReadOnly}/valuations`,

  NewValuation: '/plots',

  ValuationType: (plotId: string) => `/new-plot/${plotId}/valuation-type`,
  ClientType: (plotId: string) => `/new-plot/${plotId}/client-type`,
  ClientDetails: (plotId: string) => `/new-plot/${plotId}/client-details`,
  ValuerDetails: (plotId: string) => `/new-plot/${plotId}/valuer-details`,
  PropertyDetails: (plotId: string, reportTemplateId: string) => `/new-plot/${plotId}/${reportTemplateId}/property-details`,
  SecondPropertyDetails: (plotId: string, reportTemplateId: string) => `/new-plot/${plotId}/${reportTemplateId}/second-property-details`,
  ReportContent: (plotId: string, reportTemplateId: string) => `/new-plot/${plotId}/${reportTemplateId}/second-report-content`,
  ValuationReport: (plotId: string, reportTemplateId: string) => `/new-plot/${plotId}/${reportTemplateId}/valuationreport`,
  SecondValuationReport: (plotId: string) => `/new-plot/${plotId}/valuationreport`,

  Instruction: (plotId: string) => `/new-plot/${plotId}/client-type`,

  NewValuationReport: '/plots',

  NewPlot: '/plots/new',
  NewTenant: (plotId: string) => `/plots/${plotId}/tenants/new`,
  NewParking: (plotId: string) => `/plots/${plotId}/parking/new`,
  NewOutgoing: (plotId: string) => `/plots/${plotId}/outgoings/new`,
  NewInsurance: (plotId: string) => `/plots/${plotId}/insurances/new`,

  ValuationReports: '/valuationreports',
  ValuationReportDetails: (plotId: string) => `/valuationreports/${plotId}`,
  ReportPreview: (reportId: string) => `/report/${reportId}/pdfpreview`,

  ViewESRIImage: (plotNumber: string) => `/view-esri-image/${plotNumber}`,

  SearchPlot: `/plots/valuation-card`,
  ESRI_ValuationCard: `/plots/search-plot-valuation-card`,
};