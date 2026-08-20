import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = {
  projectId: "crm-ca-db172",
  privateKeyId: "37f9390c308e9c368e91e00313df822b2f0a4896",
  privateKey:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCJBYwggSiAgEAAoIBAQCwYS8PHtxCp9mI\nkVW1Ew7KxYQab480Jx4GaYVURH9aRL8aglQ2jNjSyyEENYtoayfBSIfn1CRdICbf\n/VPeBWoRPH51vxquSxdfi+jJODIaTKBHxL/jWPyNwkvG7pa5LS7MsQdqafTkLSmK\nJKSTDEr0GOTBXPfrui6nZ85xGqltkqS4/aB3iKBxqcFFVYKzBoKg/JcZhMJHHab+\ncDZEFSETx6pdjS09twfEErP3QIyzy7msMkIAgXWhYBph6C0eg08SubVght8oZ72t\n9jNW6DHgpU/oly9Tu+uzq3LEFkv9UrTzHXqWgAls+mxW/VzaQNNJ7vg2GVSepUbH\nN6sLFwa7AgMBAAECggEAJLpoAT8M4LhxHPYeodExIFpW8uZOLK8EmpM4l16YImT0\nYoHHJYDY2bRA0M6RlBHUOnRvEIBlfhrm3Xe0EiSQfLxbHQvJc4fhexz4QYZ5MG7K\nZYd76cyq8p4GB4vBSRg2iZtHjwo3W5hn8QNGXfSOWxwf7n/8hFLFykhcfcLuiwlI\n0fWiCE+srU+zNcZr7y05YCpcjQmOgQbFuLLiGdcuSvePbxd7OqbuINOndQEbF+AK\nY8NzUy17P8UpCuKuhWNKqoMtl6oKOHYvHUdRdDavxhgYBPQ9e3X0Xj543b+orPx+\n329DT4KlVzM1m97xPS6lCc9y96Ko6cIcLnyD4pcToQKBgQDV6kQ7mcGWjxZ5UIPA\nY8LaC9OwQWWDBK83cvuJljhLUw6exllCEK6+3tiQypHLaHTKZ0TXPhwcIBz3wE0e\nDCYnM9qP5AyUMknAG1GXts26qLnqQXIVjp2GK+MhYM8VSyZF8r6t2bMGRx8fXgmw\nT1oKCdPlsjzIpW1/FzknG76ycQKBgQDTFHXmfXA0bhhwd1ltak+1w0E8sgCan0gi\nm0IMbcJFKHFEV5zGFmM7JlyES3SB6LQt3ubeW4IPqnx3I2vMTubX9lKt5wi2BtLV\nFTbWRh2BPVytwq2GRqOuLds0s5yiAJ6G04jS821O5f3gZUXkLbXgyLda8NtHlxc3\nTy+syhdJ6wKBgGHwzqjTLxV2Ef4dZRVTF8WpoJSUfJvOK0Mh/BT0mHW0Y39CpV9g\nMAHoGhPBC5usCb0aJyS9pTUjZt/wRd66BUXxseIrsa6wj5/LYkIqSmtqESU2Lbu8\n/laOBYIkxuui6rUf/Tmv8Q2wxokgDyOQUVNDSKdkQfxD8aw8v8guJdOhAoGAEbRg\no0GYPL2TTTOli5jkMLG88hNYG6AKk+SD6Lj4F4bp4TqcCr1r+1UfY3VUw2S6YDKX\nGMWCJkA9ilytOQjRMgIWM0HyqBnwazEJVXWyGdoEwQpYNbANIJn2DfiWxbvZkCOE\nEXWbkIeYAM9dymLPI5iSUI1tRxb0Oo5oyEx3IZsCgYBhSNzMwyuzwf5G3Y9zDgGA\nKd4PicOHbQMGqgA1ltiVb7SrqN8tpf6ythiZXOcl11im/2cpn1uEUVz3YIQbCtTj\n+5A4u2qvGw/AcstXFDv8ZgCqObMhXyB3miXPYhe75Co4cOe8oZcsYrDNSJ6aoxfb\n2wSdA3eOxQm6+zWgg0Rp4g==\n-----END PRIVATE KEY-----\n",
  clientEmail:
    "firebase-adminsdk-fbsvc@crm-ca-db172.iam.gserviceaccount.com",
  clientId: "114644499006860759446",
};

export const isFirebaseAdminConfigured = () => Boolean(serviceAccount.projectId);

export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) return null;
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}
