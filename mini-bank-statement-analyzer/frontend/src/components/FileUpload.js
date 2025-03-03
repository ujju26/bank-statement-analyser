import React, { useState } from "react";
import axios from "axios";

const FileUpload = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [dragging, setDragging] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        setFile(event.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Please select a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("http://localhost:5000/api/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setMessage(response.data.message);

            if (onUploadSuccess) {
                setTimeout(() => {
                    onUploadSuccess();
                }, 2000);
            }
        } catch (error) {
            setMessage(error.response?.data?.message || "File upload failed.");
        }
    };

    return (
        <div className="upload-container">
            <h2>Upload Bank Statement (CSV or JSON)</h2>

            <div 
                className={`drag-drop-area ${dragging ? "dragging" : ""}`} 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {file ? <p>{file.name}</p> : <p>Drag & Drop a file here or click to select</p>}
                <input type="file" onChange={handleFileChange} accept=".csv,.json" style={{ display: "none" }} id="fileInput" />
                <label htmlFor="fileInput" className="upload-btn">Choose File</label>
            </div>

            <button className="upload-btn" onClick={handleUpload}>Upload</button>
            
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default FileUpload;
