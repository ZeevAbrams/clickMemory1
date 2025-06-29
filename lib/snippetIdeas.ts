export const SNIPPET_TITLE_CHAR_LIMIT = 30;
export const SNIPPET_ROLE_CHAR_LIMIT = 80;
export const SNIPPET_CONTENT_CHAR_LIMIT = 8000;
export const CONTEXT_MENU_SNIPPET_LIMIT = 5;
export const TOTAL_SNIPPET_LIMIT = 20;

export interface SnippetIdea {
  title: string;
  content: string;
}

export const SNIPPET_IDEAS: SnippetIdea[] = [
  {
    title: 'Basic Company Info',
    content: `You are working at COMPANY.
The company is in the industry of INDUSTRY.
The type of company is a B2B/B2C/etc.
The problem we solve is PROBLEM.
The solution we provide is SOLUTION.
Our main differentiator is DIFFERENTIATOR.
Our target audience is TARGET AUDIENCE.
Our target customer is TARGET CUSTOMER.

`
  },
  {
    title: 'Trip Planner',
    content: 'Suggest a 3-day itinerary for a trip to Paris, including food and sightseeing.'
  },
  {
    title: 'Resume Reviewer',
    content: 'Give feedback on this resume and suggest improvements for clarity and impact.'
  },
  {
    title: 'Basic PRD Generator',
    content: `
    
    `
  }
]; 