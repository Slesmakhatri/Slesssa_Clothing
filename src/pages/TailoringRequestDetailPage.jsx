import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TailoringRequestThread from '../components/tailoring/TailoringRequestThread';
import { getTailoringRequest } from '../services/api';

function TailoringRequestDetailPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);

  function loadRequest() {
    getTailoringRequest(requestId).then(setRequest).catch(() => setRequest(null));
  }

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  return (
    <section className="section-space">
      <div className="container">
        {request?.assigned_tailor || request?.tailor_id ? (
          <div className="d-flex justify-content-end mb-3">
            <Link
              to={`/messages?kind=customer_tailor&tailoring_request_id=${request.id}`}
              className="btn btn-slessaa btn-slessaa-outline"
            >
              Chat with Tailor
            </Link>
          </div>
        ) : null}
        <TailoringRequestThread request={request} onMessageCreated={loadRequest} />
      </div>
    </section>
  );
}

export default TailoringRequestDetailPage;
