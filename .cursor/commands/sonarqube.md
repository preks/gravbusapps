Use the sonarqube-mcp to check all issues with the status OPEN in the pull request with the id <id>.
Use the "search_sonar_issues_in_projects" tool with the following configuration

{
"projects": [
"new-work-team_gravity-business-apps"
],
"pullRequestId": "<id>",
"ps": 500

}
Create a full plan of ALL open issues so that we can fix them. The plan must contain all of the <amount> issues

If you do not know the id and the amount ask the user directly about it before executing the tool
