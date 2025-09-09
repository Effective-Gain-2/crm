// Utility function to get file icon and styling based on file type
export const getFileIcon = (mimeType, fileName) => {
  // Default icon for unknown file types
  let icon = 'bi-file-earmark';
  let bgColor = '#6c757d';
  let color = '#ffffff';

  if (mimeType) {
    if (mimeType.includes('pdf')) {
      icon = 'bi-file-earmark-pdf';
      bgColor = '#dc3545';
      color = '#ffffff';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || 
               mimeType.includes('vnd.ms-excel') || mimeType.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      icon = 'bi-file-earmark-excel';
      bgColor = '#198754';
      color = '#ffffff';
    } else if (mimeType.includes('word') || mimeType.includes('document') || 
               mimeType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document') || 
               mimeType.includes('msword')) {
      icon = 'bi-file-earmark-word';
      bgColor = '#0d6efd';
      color = '#ffffff';
    } else if (mimeType.includes('image')) {
      icon = 'bi-file-earmark-image';
      bgColor = '#fd7e14';
      color = '#ffffff';
    } else if (mimeType.includes('audio')) {
      icon = 'bi-file-earmark-music';
      bgColor = '#6f42c1';
      color = '#ffffff';
    } else if (mimeType.includes('video')) {
      icon = 'bi-file-earmark-play';
      bgColor = '#e83e8c';
      color = '#ffffff';
    }
  } else if (fileName) {
    // Fallback to file extension if MIME type is not available
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        icon = 'bi-file-earmark-pdf';
        bgColor = '#dc3545';
        color = '#ffffff';
        break;
      case 'xlsx':
      case 'xls':
        icon = 'bi-file-earmark-excel';
        bgColor = '#198754';
        color = '#ffffff';
        break;
      case 'doc':
      case 'docx':
        icon = 'bi-file-earmark-word';
        bgColor = '#0d6efd';
        color = '#ffffff';
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        icon = 'bi-file-earmark-image';
        bgColor = '#fd7e14';
        color = '#ffffff';
        break;
      case 'mp3':
      case 'wav':
      case 'ogg':
        icon = 'bi-file-earmark-music';
        bgColor = '#6f42c1';
        color = '#ffffff';
        break;
      case 'mp4':
      case 'avi':
      case 'mov':
        icon = 'bi-file-earmark-play';
        bgColor = '#e83e8c';
        color = '#ffffff';
        break;
      default:
        icon = 'bi-file-earmark';
        bgColor = '#6c757d';
        color = '#ffffff';
    }
  }

  return { icon, bgColor, color };
};
