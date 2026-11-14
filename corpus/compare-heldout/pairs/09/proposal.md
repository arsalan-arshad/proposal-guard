Proposal: reporting stack migration for Meridian Pet Supply

Hi Birgit and team,

Here is how I would handle the move. I am a freelance infrastructure engineer; this size of migration is a typical week or two of focused work, with the rest of the time spent on testing and waiting for approvals.

Plan
1. Inventory of the old server: the database, cron jobs, scripts and their dependencies.
2. Build the target environment on Google Cloud in your own project, with infrastructure described as code so you can see every resource.
3. Rehearsal migration on a copy, with timings, then the real cut-over in a single night window.
4. Backups, a documented restore test and email alerts for failed jobs.
5. Runbook and a one-hour handover session.

Costs
The Google Cloud usage costs are billed to your organisation, since the project lives in your account. I will give an estimate of the monthly cost before the build so there are no surprises.

Timeline
I plan to finish the cut-over within 5 weeks of the start date, if I have access in the first week.

Approvals
I will send the cut-over plan one week before the night window. Please let me know if the date does not work.

Invoicing
Invoiced in two parts, with payment within 30 days.

Thanks,
Emre Castellanos
