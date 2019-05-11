/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START calendar_quickstart]
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const moment = require('moment');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);
	// Authorize a client with credentials, then call the Google Calendar API.
	authorize(JSON.parse(content), listEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
			client_id, client_secret, redirect_uris[0]);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error retrieving access token', err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) return console.error(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
	const calendar = google.calendar({version: 'v3', auth});
	calendar.events.list({
		calendarId: 'ft.com_hljro7f48ee5p65bo7dfpltajs@group.calendar.google.com',
		timeMin: (new Date('2019-04-01')).toISOString(),
		// maxResults: 1,
		singleEvents: true,
		orderBy: 'startTime',
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
		const events = res.data.items;
		console.log('HOURS SPENT OVER 17 MEASURED DAYS')
		if (events.length) {
			events.map((event, i) => {
				// console.log(event);
				const start = moment(event.start.dateTime || event.start.date);
				const end = moment(event.end.dateTime || event.end.date);
				const duration = moment.duration(end.diff(start))
				// console.log(`${duration.asHours()} - ${event.summary}`);
				categorize(duration.asHours().toFixed(2), event.summary);
			});

			const totalsPerCategory = Object.entries(categories).map(category => {
				const totalTimeForCategory = category[1].reduce((acc, cur) => {
					return acc + Number(cur.duration);
				}, 0);

				return {category: category[0], duration: Math.round(totalTimeForCategory)}
			})

			console.log(totalsPerCategory)

			const totalHours = totalsPerCategory.reduce((acc, cur) => {
				return acc + cur.duration;
			}, 0)

			console.log({totalHours})

			const avgHoursPerDay = Math.round(totalHours/17);
			const avgHoursPerWeek = Math.round(avgHoursPerDay*5);
			const avgEffort = `${Math.round(avgHoursPerWeek*100/35)}%`;

			console.log({avgHoursPerDay})
			console.log({avgHoursPerWeek})
			console.log({avgEffort})

			// 142%
			const splits = totalsPerCategory.map(({category, duration}) => {
				return {category, percentage: `${Math.round(duration*100/170)}%`}
			})

			console.log({splits})

			console.log('=== DETAIL ===')
			console.log(categories)
		} else {
			console.log('No upcoming events found.');
		}
	});
}
// [END calendar_quickstart]
const categories = {
	'admin': [],
	'email': [],
	'b2b': [],
	'etg': [],
	'hr': [],
	'people api': [],
	'unfocused': [],
	'career': [],
	'timesheets': [],
	// 'lunch': [],
	'people': [],
	'mentoring': [],
	'pip': [],
	'vms': [],
	'facebook': [],
	'competencies': [],
	'other': []
};

// Categorize and clean data a little
function categorize(duration, summary) {
	let found = false;
	for (const key of Object.keys(categories)) {
		if (summary.toLowerCase().includes(key)) {
			found = true;
			// Don't count People API work under people
			if (summary.toLowerCase().includes('api') && key === 'people') continue;

			// Don't count PIP work under people
			if (summary.toLowerCase().includes('pip') && key === 'people') continue;

			// Don't count email admin as Email Platform
			if (summary.toLowerCase().includes('admin') && key === 'email') continue;

			// Don't count mentoring under people
			if (summary.toLowerCase().includes('mentoring') && key === 'people') continue;


			// Only count my mentoring to others (non reports) under mentoring
			if (summary.toLowerCase().includes('career') && key === 'mentoring') continue;

			// Don't count Career Competencies work as career development
			if (summary.toLowerCase().includes('competencies') && key === 'career') continue;

			categories[key].push({duration, summary});
		}
	}
	if (!found) {
		// can't spell
		if (summary.toLowerCase().includes('unfocussed')) {
			categories.unfocused.push({duration, summary});
		}
		else if (summary.toLowerCase().includes('meeting')) {
			categories.admin.push({duration, summary})
		}
		else if (summary.toLowerCase().includes('mba')) {
			categories.career.push({duration, summary})
		}
		else if (summary.toLowerCase().includes('squad')) {
			categories.people.push({duration, summary})
		}
		else if (summary.toLowerCase().includes('lunch')) {
			//don't count lunch;
		}
		else {
			categories.other.push({duration, summary})
		}
	}
}

module.exports = {
	SCOPES,
	listEvents,
};