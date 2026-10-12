export const imageAccept:string;
export const fileAccept:string;
export function validateEditorialFile(file:File,imagesOnly?:boolean):Promise<{extension:string;mime:string;image:boolean}>;
