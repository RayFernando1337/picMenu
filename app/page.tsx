"use client";

import { useS3Upload } from "next-s3-upload";
import { useState } from "react";
import { experimental_useObject as useObject } from "ai/react";
import Dropzone from "react-dropzone";
import { PhotoIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Input } from "@/components/ui/input";
import { MenuGrid } from "@/components/menu-grid";
import Image from "next/image";
import { italianMenuUrl, italianParsedMenu } from "@/lib/constants";
import { menuSchema } from "@/lib/schemas";
import type { MenuItem } from "@/lib/schemas";

export default function Home() {
  const { uploadToS3 } = useS3Upload();
  const [menuUrl, setMenuUrl] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"initial" | "uploading" | "parsing">("initial");
  const [searchTerm, setSearchTerm] = useState("");

  const { object: menuItems, error, isLoading } = useObject({
    api: "/api/parseMenu",
    schema: menuSchema,
  });

  const handleFileChange = async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      setStatus("uploading");
      setMenuUrl(objectUrl);
      
      const { url } = await uploadToS3(file);
      setMenuUrl(url);
      setStatus("parsing");
      
    } catch (err) {
      console.error("Error processing file:", err);
      setStatus("initial");
    }
  };

  const handleSampleImage = async () => {
    setStatus("parsing");
    setMenuUrl(italianMenuUrl);
  };

  const filteredMenu = menuItems?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  return (
    <div className="container text-center px-4 py-8 bg-white max-w-5xl mx-auto">
      <div className="max-w-2xl text-center mx-auto sm:mt-20 mt-2">
        <p className="mx-auto mb-5 w-fit rounded-2xl border px-4 py-1 text-sm text-slate-500">
          100% free and powered by{" "}
          <a
            href="https://dub.sh/together-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition font-bold"
          >
            Together AI
          </a>
        </p>
        <h1 className="mb-6 text-balance text-6xl font-bold text-zinc-800">
          Visualize your menu with AI
        </h1>
      </div>

      {status === "initial" && (
        <div className="max-w-2xl mx-auto">
          <Dropzone
            accept={{ "image/*": [".jpg", ".jpeg", ".png"] }}
            multiple={false}
            onDrop={(acceptedFiles) => handleFileChange(acceptedFiles[0])}
          >
            {({ getRootProps, getInputProps, isDragAccept }) => (
              <div
                className={`mt-2 flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed ${
                  isDragAccept ? "border-blue-500" : "border-gray-300"
                }`}
                {...getRootProps()}
              >
                <input {...getInputProps()} />
                <div className="text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <div className="mt-4 text-sm leading-6 text-gray-600">
                    <p className="text-xl font-semibold">Upload your menu</p>
                    <p className="mt-1">or take a picture</p>
                  </div>
                </div>
              </div>
            )}
          </Dropzone>
          <button
            className="mt-5 font-medium text-blue-400 text-md hover:text-blue-500"
            onClick={handleSampleImage}
          >
            Try an example menu
          </button>
        </div>
      )}

      {menuUrl && (
        <div className="my-10 mx-auto flex flex-col items-center">
          <Image
            width={1024}
            height={768}
            src={menuUrl}
            alt="Menu"
            className="w-40 rounded-lg shadow-md"
          />
        </div>
      )}

      {isLoading && (
        <div className="mt-10 flex flex-col items-center">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="text-lg text-gray-600">Creating your visual menu...</p>
          </div>
        </div>
      )}

      {menuItems && menuItems.length > 0 && (
        <div className="mt-10">
          <h2 className="text-4xl font-bold mb-5">
            Menu – {menuItems.length} dishes detected
          </h2>
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <MenuGrid items={filteredMenu} />
        </div>
      )}

      {error && (
        <div className="mt-10 text-red-500">
          An error occurred while processing your menu
        </div>
      )}
    </div>
  );
}
