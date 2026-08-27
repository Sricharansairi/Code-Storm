-- Table to track visitors who log into the application
CREATE TABLE site_visits (
  email text PRIMARY KEY,
  last_visited_at timestamp with time zone DEFAULT now()
);

-- Table to store emails from the excel sheet (allowed/registered users)
CREATE TABLE registered_emails (
  email text PRIMARY KEY
);

-- Note: In a production environment, you would want to add RLS (Row Level Security) policies here.
