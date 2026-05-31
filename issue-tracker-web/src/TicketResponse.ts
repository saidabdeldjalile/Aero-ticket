export interface TicketResponse {
  // Define the properties of the Ticket type here
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  issueType?: string;
  comments: Comment[];
  createdAt: string;
  modifiedAt: string;
  created: User;
  assigned: User;
  project: Project;
  routedDepartmentName?: string;
  routingReason?: string;
  workflowStage?: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
}
export interface User {
  firstName: string;
  lastname: string;
  email: string;
}
export interface Comment {
  id: number;
  email: string;
  comment: string;
  created: string;
  username: string;
  role?: string;
}

export interface Screenshot {
  id: number;
  imageUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  uploadedByEmail: string;
  uploadedByName: string;
}


export interface Project {
  id: number;
  name: string;
  departmentId?: number;
  departmentName?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface PaginatedTickets {
  content: TicketResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export function formatDate(value?: string): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}
