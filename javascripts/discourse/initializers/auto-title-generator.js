import { withPluginApi } from "discourse/lib/plugin-api";

export default {
	name: "auto-title-generator",

	initialize() {
		withPluginApi("1.0.0", (api) => {
			// Configure which categories get auto-titles
			const categoryTitlePrefixes = {
				"player-reports": "Player Report",
				"support-tickets": "Support Ticket",
				"bug-reports": "Bug Report",
			};

			console.log("📝 Auto-title categories configured:", Object.keys(categoryTitlePrefixes));

			api.onAppEvent("composer:opened", () => {
				const composer = api.container.lookup("service:composer");
				const model = composer.model;

				if (!model) return;

				// Only for new topics
				if (model.action === "createTopic" && model.category) {
					const categorySlug = model.category.slug;
					const prefix = categoryTitlePrefixes[categorySlug];

					if (prefix && !model.title) {
						// Generate random ID (6 characters)
						const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
						model.set("title", `${prefix} #${randomId}`);
						console.log(`📝 Auto-filled title for ${categorySlug}`);
					}
				}
			});
		});
	},
};
