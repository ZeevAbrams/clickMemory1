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
    title: 'Basic PRD Generator',
    content: `Given the company info, write a PRD for the following feature: FEATURE_IDEA.

The PRD should have the following sections (each section should be a separate section):
1. Market Problem and Market Opportunity (What is the problem, and how big is the market opportunity)
2. Why this is worth solving (at least 2 logical reasons why we know that this is a problem that needs solving)
3. Competition (short list of up to 10 competitors)
4. User Persona (ICP)
5. Target Customers (the Customer actually pays for the product)
6. Solution Overview (What is the solution, and how does it work)
7. Feature List (top 5 main features)
8. OKRs (Provide 4 L1 and L2 OKRs to develop the feature or product. Each OKR should be a single sentence)
9. Product Requirements (System, Compatibility and Performance Requirements. Short list of 3 for each category)
10. Success Criteria (Up to 3 key metrics that we will use to measure the success of the product)`
  },
  {
    title: 'User Stories and Acceptance Criteria',
    content: `Here is the idea for the new feature we are building: FEATURE_IDEA'

For this idea, I want you to write a User Story for the feature following the format:
As a [type of user], I want to [perform some task] so that I can [achieve some goal].
The User Story should be written in a tone that uses an Active Voice, and the Story is achievable.
Next, You will write 2 separate Acceptance Criteria for this User Story using the Gherkin Framework, which first describes the Scenario, 
then states GIVEN, WHEN, THEN, and AND. Use the AND statement for any of the three operators as needed. 
You will create 2 Acceptance Criteria for the Positive Scenarios, 2 Acceptance Criteria for the Negative Scenarios, 
and 2 Acceptance Criteria for the Outlier Scenarios.
Think this through, step by step, to come up with all 6 Scenarios and their Acceptance Criteria. 
The Positive Scenarios should be the most common.
The Negative Scenarios should deal with edge cases where the solution must cope with unexpected user input or challenges.
The Outlier Scenarios should deal with things that are unexpected, but still possible, and should be tested.
The Scenarios and Acceptance Criteria should be in the following format: 'SCENARIO : ACCEPTANCE CRITERIA'. `
  },
  {
    title: 'Product Team Feedback',
    content: `Given everything written here about a PRODUCT/FEATURE, provide Constructive Criticism or Feedback on the main issues that could be anticipated. 
For each of the 4 risk categories below, write a single paragraph that may be a problem, given the information provided. Each paragraph will be up to 80 words in length, such that the total output of the response shall be less than 400 words. The 4 categories are:
1. value risk (whether customers will buy it or users will choose to use it)
2. usability risk (whether users can figure out how to use it)
3. feasibility risk (whether our engineers can build what we need with the time, skills and technology we have)
4. business viability risk (whether this solution also works for the various aspects of our business)
`
  }
]; 