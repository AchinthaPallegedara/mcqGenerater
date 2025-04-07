import Image from "next/image";
import PDFUpload from "./components/PDFUpload";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900">
      <PDFUpload />
      <div className="w-full flex items-center justify-center h-10">
        <Image
          src={"/ClaviqLogowhite.png"}
          height={40}
          width={70}
          alt="Claviq Logo"
          className="mb-10"
        />
      </div>
    </main>
  );
}
