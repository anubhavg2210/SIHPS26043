import { useState, useEffect } from 'react';
import { trustApi } from '../../services/api';

function TrustDashboardPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('FLAGGED');
    const [reviewRemarks, setReviewRemarks] = useState({});

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = filter === 'ALL' ? {} : { status: filter };
            const res = await trustApi.getEvents(params);
            setEvents(res.events || res.data?.events || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch trust events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const handleReview = async (id) => {
        try {
            await trustApi.reviewEvent(id, { remarks: reviewRemarks[id] || '' });
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to review event');
        }
    };

    const getSeverityBadge = (sev) => {
        const colors = {
            LOW: 'bg-yellow-100 text-yellow-800',
            MEDIUM: 'bg-orange-100 text-orange-800',
            HIGH: 'bg-red-100 text-red-800',
            CRITICAL: 'bg-red-600 text-white',
        };
        return `px-2 py-1 text-xs rounded-full font-medium ${colors[sev] || colors.LOW}`;
    };

    return (
        <div className="flex flex-col h-full w-full">
            <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Trust & Safety Dashboard</h1>
                    <div className="flex gap-2">
                        {['FLAGGED', 'REVIEWED', 'ALL'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">{error}</div>}

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
                        No {filter !== 'ALL' ? filter.toLowerCase() : ''} trust events found.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User / Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Needed</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {events.map(ev => (
                                    <tr key={ev.id}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{ev.user_name}</div>
                                            <div className="text-sm text-gray-500">{new Date(ev.created_at).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{ev.event_type}</div>
                                            <div className="text-sm text-gray-500">{ev.reason}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={getSeverityBadge(ev.severity)}>{ev.severity}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ev.status === 'FLAGGED' ? (
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Review remarks..." 
                                                        className="text-sm border rounded px-2 py-1 w-full"
                                                        value={reviewRemarks[ev.id] || ''}
                                                        onChange={(e) => setReviewRemarks({...reviewRemarks, [ev.id]: e.target.value})}
                                                    />
                                                    <button 
                                                        onClick={() => handleReview(ev.id)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
                                                    >
                                                        Mark Reviewed
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">
                                                    Reviewed by Authority
                                                    {ev.reviewer_remarks && <div className="italic mt-1">"{ev.reviewer_remarks}"</div>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}

export default TrustDashboardPage;
