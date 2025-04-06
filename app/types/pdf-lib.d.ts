declare module "pdf-lib" {
  export class PDFDocument {
    static load(data: ArrayBuffer): Promise<PDFDocument>;
    getPages(): PDFPage[];
  }

  export class PDFPage {
    getTextContent(): Promise<{
      items: Array<{
        str: string;
      }>;
    }>;
  }
}
