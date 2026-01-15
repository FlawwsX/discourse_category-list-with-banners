import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class CategorySorter extends Component {
	@service router;

	constructor() {
		super(...arguments);

		// Run initially
		setTimeout(() => this.sortAndInject(), 50);

		// Run on every route change to categories
		this.router.on('routeDidChange', () => {
			if (this.router.currentRouteName === 'discovery.categories') {
				setTimeout(() => this.sortAndInject(), 50);
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

		// 🔍 Find the wrapper dynamically based on first child being a category table
		const candidates = document.querySelectorAll('div.ember-view');
		let originalWrapper = null;
		candidates.forEach((wrapper) => {
			const firstChild = wrapper.firstElementChild;
			if (
				firstChild &&
				firstChild.tagName === 'TABLE' &&
				firstChild.classList.contains('category-list') &&
				firstChild.classList.contains('with-topics')
			) {
				originalWrapper = wrapper;
			}
		});

		if (!originalWrapper) {
			console.warn('❌ Could not find the category table wrapper.');
			return;
		}

		const originalTable = originalWrapper.querySelector(
			'table.category-list.with-topics'
		);
		if (!originalTable) {
			console.warn('❌ Table not found inside wrapper.');
			return;
		}

		// ✅ Use the correct reference here
		const originalRows = originalTable.querySelectorAll(
			'tbody tr[data-category-id]'
		);

		const rowMap = new Map();
		originalRows.forEach((row) => {
			const id = parseInt(row.getAttribute('data-category-id'), 10);
			rowMap.set(id, row);
		});

		const containers = {};
		Object.keys(groupMapping).forEach((group) => {
			containers[group] = this.createTable(group);
		});
		containers.other = this.createTable('other');

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

			containers[matchedGroup].tbody.appendChild(row);
		});

		for (const { container, table } of Object.values(containers)) {
			if (table.querySelector('tbody').children.length > 0) {
				container.appendChild(table);
			}
		}

		// ✅ Safely remove the original wrapper
		originalWrapper.remove();
	}

	createTable(groupKey) {
		const container = document.querySelector(`.category-thing.${groupKey}`);
		if (!container) {
			console.warn(`⚠️ No container found for group: ${groupKey}`);
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
			container: container || this.createFallbackDiv(groupKey),
		};
	}

	createFallbackDiv(groupKey) {
		const fallback = document.createElement('div');
		fallback.className = `category-thing ${groupKey}`;
		document.body.appendChild(fallback);
		return fallback;
	}
}
