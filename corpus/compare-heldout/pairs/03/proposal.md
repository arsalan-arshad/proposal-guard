Proposal: Northgate Field Service App

Prepared by Sable Mobile Studio

Summary
We are a three-person studio that builds mobile apps for operational teams. We propose a cross-platform app with an offline-first design, a small admin dashboard and an integration with your ticketing system.

Approach
1. Discovery workshop with two technicians and one dispatcher.
2. Clickable prototype, tested on a real device by three technicians.
3. Build in two-week sprints with a demo at the end of each sprint.
4. Pilot in one depot, then roll out.

Technical notes
The app is built with React Native. Data is stored locally and synced when the connection returns. The backend exposes a documented REST interface and your ticketing system is connected through its public API.

Changes
Requests that go beyond the agreed feature list are written up as a change request with an estimate, and work starts only after you approve the estimate.

Assumptions
Your IT team provides a test instance of the ticketing system. A technician is available for testing for a half day each sprint.

Team and availability
Our lead developer and a designer start two weeks after contract signature.
