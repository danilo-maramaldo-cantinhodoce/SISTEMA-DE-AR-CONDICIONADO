/**
 * EXAMPLE PAGE — Reference for AI-generated pages.
 * Delete this file when building your app. It exists to show correct patterns.
 */

import { useParams } from 'react-router';

export default function ExamplePage() {
	const { id } = useParams();

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold">Example page</h1>
			<p className="mt-2 text-sm text-muted-foreground">Route id: {id ?? 'none'}</p>
		</div>
	);
}
