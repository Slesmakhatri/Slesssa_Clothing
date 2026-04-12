import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
        <TailoringRequestThread request={request} onMessageCreated={loadRequest} />
      </div>
    </section>
  );
}

export default TailoringRequestDetailPage;
