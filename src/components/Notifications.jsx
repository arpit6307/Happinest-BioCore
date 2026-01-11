import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { 
  FiBell, FiTrash2, FiClock, FiAlertCircle, 
  FiInfo, FiArrowLeft, FiCheckSquare 
} from "react-icons/fi";
import { 
  collection, query, orderBy, onSnapshot, doc, 
  deleteDoc, updateDoc, writeBatch, where 
} from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { ToastNotification } from './CustomAlerts';

const Notifications = ({ setActiveTab, selectedBranch }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  // 1. Fetch Notifications (Filtered by Target User)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // ✅ UPDATE: Query only notifications where targetUserId matches current User
    // This ensures User A does not see User B's notifications
    const q = query(
      collection(db, "notifications"), 
      where("targetUserId", "==", currentUser.uid), // 👈 Filter for specific user
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      // Note: If you see an index error in console, click the link provided by Firebase
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
  };

  // 2. Mark Single Notification as Read
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  // 3. Mark All as Read
  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) {
      showToast("No unread notifications.", "info");
      return;
    }

    setActionLoading(true);
    try {
      // Firebase Batch limit is 500, we slice to 400 for safety
      const batch = writeBatch(db);
      
      unreadNotifs.slice(0, 400).forEach((notif) => {
        const docRef = doc(db, "notifications", notif.id);
        batch.update(docRef, { read: true });
      });

      await batch.commit();
      showToast("All notifications marked as read!", "success");
    } catch (error) {
      console.error("Batch update failed:", error);
      showToast("Failed to update notifications.", "error");
    }
    setActionLoading(false);
  };

  // 4. Delete Notification
  const deleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      showToast("Notification deleted", "info");
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Error deleting notification", "error");
    }
  };

  // Helper: Get Icon based on type
  const getIcon = (type) => {
    switch (type) {
      case 'danger': return <FiAlertCircle className="text-danger" />;
      case 'warning': return <FiAlertCircle className="text-warning" />;
      case 'info': return <FiInfo className="text-info" />;
      default: return <FiBell className="text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="p-0 fade-in">
      <ToastNotification 
        show={toast.show} 
        message={toast.msg} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {/* Back Button for Mobile */}
            <Button 
              variant="light" 
              className="rounded-circle me-3 d-md-none" 
              onClick={() => setActiveTab('dashboard')}
            >
              <FiArrowLeft />
            </Button>
            <div>
              <h5 className="fw-bold mb-0">Notifications</h5>
              <small className="text-muted">Your alerts & messages</small>
            </div>
          </div>
          
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="rounded-pill px-3 fw-bold"
            onClick={markAllAsRead}
            disabled={actionLoading || !notifications.some(n => !n.read)}
          >
            {actionLoading ? 'Processing...' : <><FiCheckSquare className="me-2" /> Mark All Read</>}
          </Button>
        </Card.Header>

        <Card.Body className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-5">
              <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                <FiBell size={40} className="text-muted" />
              </div>
              <h6 className="text-muted">No notifications yet.</h6>
            </div>
          ) : (
            <ListGroup variant="flush">
              {notifications.map((notif) => (
                <ListGroup.Item 
                  key={notif.id}
                  className={`p-3 border-bottom border-light transition-all ${!notif.read ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="d-flex justify-content-between">
                    <div className="d-flex gap-3">
                      <div className="mt-1" style={{ fontSize: '1.2rem' }}>
                        {getIcon(notif.type)}
                      </div>
                      <div>
                        <div className={`fw-bold mb-1 ${!notif.read ? 'text-primary' : 'text-dark'}`}>
                          {notif.title}
                          {!notif.read && <Badge bg="primary" pill className="ms-2" style={{ fontSize: '0.6rem' }}>NEW</Badge>}
                        </div>
                        <p className="text-muted small mb-2">{notif.message}</p>
                        <div className="d-flex align-items-center gap-3 text-muted" style={{ fontSize: '0.75rem' }}>
                          <span className="d-flex align-items-center gap-1">
                            <FiClock /> {notif.timestamp?.toDate().toLocaleString() || 'Just now'}
                          </span>
                          {notif.branch && <Badge bg="light" text="dark" className="border">Branch: {notif.branch}</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <div className="d-flex flex-column gap-2">
                       <Button 
                         variant="link" 
                         className="text-danger p-0" 
                         onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                       >
                         <FiTrash2 />
                       </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Notifications;