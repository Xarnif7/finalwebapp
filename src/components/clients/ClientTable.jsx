import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, MessageCircle as MessageIcon, Trash2 } from 'lucide-react';
import { getInitials } from '@/components/lib/utils';

const avatarColors = [
    'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700',
    'bg-red-100 text-red-700', 'bg-yellow-100 text-yellow-700', 'bg-indigo-100 text-indigo-700'
];

const ClientTable = ({ clients, onSendMessage, onDeleteClient }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">Name</th>
            <th scope="col" className="px-6 py-3">Contact</th>
            <th scope="col" className="px-6 py-3">Service Date</th>
            <th scope="col" className="px-6 py-3">Tags</th>
            <th scope="col" className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[index % avatarColors.length]}`}>
                    {getInitials(`${client.first_name} ${client.last_name}`)}
                </div>
                {client.first_name} {client.last_name}
              </td>
              <td className="px-6 py-4">{client.email}</td>
              <td className="px-6 py-4">{client.service_date ? new Date(client.service_date).toLocaleDateString() : 'N/A'}</td>
              <td className="px-6 py-4">
                {client.tags?.map(tag => <Badge key={tag} variant="secondary" className="mr-1">{tag}</Badge>)}
              </td>
              <td className="px-6 py-4 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSendMessage(client, 'sms')}>
                            <MessageIcon className="w-4 h-4 mr-2" /> Send SMS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendMessage(client, 'email')}>
                            <Mail className="w-4 h-4 mr-2" /> Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClient(client)} className="text-red-600 focus:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Customer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;


