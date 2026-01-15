import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class CategorySorter extends Component {
	@service router;

	constructor() {
		super(...arguments);

		// Run initially with a longer delay to ensure DOM is ready
		setTimeout(() => this.sortAndInject(), 200);

		// Run on every route change to categories
		this.router.on('routeDidChange', () => {
			if (this.router.currentRouteName === 'discovery.categories') {
				setTimeout(() => this.sortAndInject(), 200);
			}
		});
	}

	@action
	sortAndInject() {
		console.log('✅ Running sortAndInject');

		const categories = this.args.categories || [];
		const mappingRaw = this.args.mapping || '';
		const mappingList =
			typeof mappingRaw === 'string' ? mappingRaw.split('|') : mappingRaw;

		const groupMapping = {};
		mappingList.forEach((entry) => {
			const [group, ruleRaw] = entry.split(';');
			if (!group || !ruleRaw) return;

			let rule = ruleRaw.trim();
			try {
				if (rule.startsWith('[') || rule.startsWith('{')) {
					rule = JSON.parse(rule);
				}
			} catch {
				// fallback to string
			}

			groupMapping[group.trim()] = rule;
		});

		// 🔍 Try multiple selectors to find the category table
		let originalTable = null;
		
		// Try 1: Look for table with class "category-list with-topics"
		originalTable = document.querySelector('table.category-list.with-topics');
		
		// Try 2: Look for any table inside main content area
		if (!originalTable) {
			originalTable = document.querySelector('.container.list-container table');
		}
		
		// Try 3: Look for category-list class
		if (!originalTable) {
			originalTable = document.querySelector('table.category-list');
		}

		if (!originalTable) {
			console.warn('❌ Could not find the category table. Available tables:', 
				document.querySelectorAll('table'));
			return;
		}

		console.log('✅ Found category table:', originalTable);

		// Get all category rows
		const originalRows = originalTable.querySelectorAll('tbody tr[data-category-id]');
		
		if (originalRows.length === 0) {
			console.warn('❌ No category rows found');
			return;
		}

		console.log('✅ Found', originalRows.length, 'category rows');

		const rowMap = new Map();
		originalRows.forEach((row) => {
			const id = parseInt(row.getAttribute('data-category-id'), 10);
			rowMap.set(id, row);
		});

		// Create containers for each group
		const containers = {};
		Object.keys(groupMapping).forEach((group) => {
			containers[group] = this.createTable(group);
		});
		containers.other = this.createTable('other');

		// Sort categories into groups
		categories.forEach((category) => {
			const slug = category.slug;
			const row = rowMap.get(category.id);
			if (!row) return;

			let matchedGroup = 'other';

			for (const [group, rule] of Object.entries(groupMapping)) {
				const rules = Array.isArray(rule) ? rule : [rule];
				if (rules.some((prefix) => slug.includes(prefix))) {
					matchedGroup = group;
					break;
				}
			}

			console.log('📌 Category:', slug, '→ Group:', matchedGroup);
			containers[matchedGroup].tbody.appendChild(row);
		});

		// Append containers to the navigation-categories div
		const navigationCategories = document.querySelector('.navigation-categories');
		if (!navigationCategories) {
			console.error('❌ Could not find .navigation-categories');
			return;
		}

		// Clear existing content
		navigationCategories.innerHTML = '';
		
		// Append each group's container if it has categories
		for (const [groupKey, { container, table }] of Object.entries(containers)) {
			if (table.querySelector('tbody').children.length > 0) {
				console.log('✅ Appending group:', groupKey, 'with', table.querySelector('tbody').children.length, 'categories');
				
				// Make sure container has the category-thing class
				if (!container.classList.contains('category-thing')) {
					container.classList.add('category-thing', groupKey);
				}
				
				container.appendChild(table);
				navigationCategories.appendChild(container);
			}
		}

		// Hide the original table
		const originalWrapper = originalTable.closest('.ember-view');
		if (originalWrapper && originalWrapper !== navigationCategories) {
			originalWrapper.style.display = 'none';
		}

		console.log('✅ Category grouping complete!');
	}

	createTable(groupKey) {
		// Check if container already exists
		let container = document.querySelector(`.category-thing.${groupKey}`);
		
		if (!container) {
			console.warn(`⚠️ Creating new container for group: ${groupKey}`);
			container = document.createElement('div');
			container.className = `category-thing ${groupKey}`;
		}

		const table = document.createElement('table');
		table.className = 'category-list with-topics';
		table.innerHTML = `
		<thead>
			<tr>
			<th class="category">
				<span role="heading" aria-level="2" id="categories-only-category-${groupKey}">
				Category
				</span>
			</th>
			<th class="topics">Topics</th>
			<th class="latest">Latest</th>
			</tr>
		</thead>
		<tbody aria-labelledby="categories-only-category-${groupKey}"></tbody>
		`;

		return {
			table,
			tbody: table.querySelector('tbody'),
			container: container,
		};
	}
}
